# backend.py
import os
import sys
import io
import json
import base64
import sqlite3
import platform
import subprocess
from datetime import datetime, timedelta

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# -------------------------
# Chemin de base (script ou exe compilé)
# -------------------------
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FACTURES_DIR = os.path.join(BASE_DIR, "factures")
os.makedirs(FACTURES_DIR, exist_ok=True)

DB_PATH = os.path.join(BASE_DIR, "stock.db")
# -------------------------
# Classe PrintApi
# -------------------------
class PrintApi:
    MAX_COLS = 32

    def _format_money_ar(self, value):
        try:
            return f"{float(value):,.0f} Ar".replace(",", " ")
        except Exception:
            return str(value)

    def _draw_dashed_line(self, c, x1, y, x2):
        """Trace une ligne pointillée sur canvas ReportLab."""
        c.setDash(2, 2)
        c.setLineWidth(0.4)
        c.line(x1, y, x2, y)
        c.setDash()

    def _draw_png_dashed_line(self, draw, x1, y, x2, dash=6, gap=4):
        """Trace une ligne pointillée sur image PIL."""
        x = x1
        while x < x2:
            draw.line([(x, y), (min(x + dash, x2), y)], fill="black", width=1)
            x += dash + gap

    def generer_texte_ticket(self, panier):
        """Génère le texte brut du ticket à partir du panier."""
        sep = "-" * self.MAX_COLS
        lignes = [
            "MON MAGASIN".center(self.MAX_COLS),
            datetime.now().strftime("%d/%m/%Y %H:%M").center(self.MAX_COLS),
            sep,            
        ]
        total = 0
        for item in panier:
            nom = item.get("nom", "?")
            qte = int(item.get("quantiteAchat", 1))
            prix = float(item.get("prix_vente", 0))
            sous_total = qte * prix
            total += sous_total
            ligne = f"{nom[:18]:<18} {qte:>2}x{self._format_money_ar(prix):>9}"
            lignes.append(ligne)
        lignes.append(sep)
        lignes.append(f"{'TOTAL':<18} {self._format_money_ar(total):>12}")
        lignes.append("=" * self.MAX_COLS)
        lignes.append("Merci de votre visite !".center(self.MAX_COLS))
        return "\n".join(lignes)

    def generer_ticket_pdf(self, panier):
        """Génère un PDF ticket 57mm — même rendu visuel que le PNG."""
        try:
            # ---- Données panier ----
            items = []
            total = 0
            for item in panier:
                nom = item.get("nom", "?")
                qte = int(item.get("quantiteAchat", 1))
                prix = float(item.get("prix_vente", 0))
                sous_total = qte * prix
                total += sous_total
                items.append((nom, qte, prix, sous_total))

            # ---- Dimensions originales conservées ----
            texte = self.generer_texte_ticket(panier)
            lignes = texte.splitlines()

            width_mm = 57
            line_height = 3.8
            padding_top_bottom = 15
            height_mm = int(len(lignes) * line_height) + padding_top_bottom + 12  # +12 pour adresse

            page_width = width_mm * mm
            page_height = height_mm * mm
            margin = 1.5 * mm
            cx = page_width / 2

            # ---- Canvas ----
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

            y = page_height - 4 * mm

            # ---- Adresse (petite, centrée) ----
            c.setFont("Helvetica", 6)
            c.drawCentredString(cx, y, "Antananarivo, Madagascar")
            y -= 3 * mm
            c.drawCentredString(cx, y, "Tel: 034 XX XXX XX")
            y -= 4 * mm

            # ---- Nom magasin dans cadre ----
            box_h = 7 * mm
            box_w = page_width - 2 * margin
            c.setLineWidth(1.2)
            c.rect(margin, y - box_h, box_w, box_h)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(cx, y - 5.5 * mm, "KOJAKOJA")
            y -= box_h + 2.5 * mm

                # ---- Date avec jour ----
            c.setFont("Helvetica", 7)
            JOURS_FR = {"Monday":"Lun","Tuesday":"Mar","Wednesday":"Mer","Thursday":"Jeu","Friday":"Ven","Saturday":"Sam","Sunday":"Dim"}
            jour_fr = JOURS_FR[datetime.now().strftime("%A")]
            date_str = f"{jour_fr}  {datetime.now().strftime('%d/%m/%Y  %H:%M')}"
            c.drawCentredString(cx, y, date_str)
            y -= 3.5 * mm

            # ---- Séparateur pointillé ----
            self._draw_dashed_line(c, margin, y, page_width - margin)
            y -= 3.5 * mm

            # ---- Articles avec référence ----
            for i, (nom, qte, prix, sous_total) in enumerate(items, start=1):
                ref = f"{i:02d}-{i*111:03d}"
                label = f"{ref}  {nom[:16]} x{qte}"
                c.setFont("Helvetica", 7.5)
                c.drawString(margin, y, label)
                c.drawRightString(page_width - margin, y, self._format_money_ar(sous_total))
                y -= line_height * mm

            # ---- Séparateur pointillé ----
            y -= 1 * mm
            self._draw_dashed_line(c, margin, y, page_width - margin)
            y -= 4 * mm

            # ---- Total ----
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(margin, y, "TOTAL:")
            c.drawRightString(page_width - margin, y, self._format_money_ar(total))
            y -= 4 * mm

            # ---- Séparateur final simple ----
            self._draw_dashed_line(c, margin, y, page_width - margin)
            y -= 4 * mm

            # ---- Message fin ----
            c.setFont("Helvetica", 7)
            c.drawCentredString(cx, y, "Merci de votre visite !")

            # ---- Sauvegarde ----
            c.save()
            pdf_data = buffer.getvalue()
            buffer.close()

            filename = f"facture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            full_path = os.path.join(FACTURES_DIR, filename)
            with open(full_path, "wb") as f:
                f.write(pdf_data)

            return {
                "success": True,
                "pdf_base64": base64.b64encode(pdf_data).decode("utf-8"),
                "filename": filename,
                "path": full_path
            }
        except Exception as e:
            return {"success": False, "message": f"Erreur génération PDF : {e}"}

    def generer_ticket_png(self, panier):
        """Génère une image PNG du ticket optimisée pour impression thermique 57mm."""
        try:
            from PIL import Image, ImageDraw, ImageFont

            # ---- Données panier ----
            items = []
            total = 0
            for item in panier:
                nom = item.get("nom", "?")
                qte = int(item.get("quantiteAchat", 1))
                prix = float(item.get("prix_vente", 0))
                sous_total = qte * prix
                total += sous_total
                items.append((nom, qte, sous_total))

            # ---- Dimensions conservées ----
            DPI = 203
            width_px = int(57 * DPI / 25.4)  # ~455px
            line_h = 22
            padding = 20
            # Hauteur dynamique : adresse(2) + box + date + sep + items + sep + total + sep + footer
            n_lignes = 2 + 1 + 1 + 1 + len(items) + 1 + 1 + 1 + 1
            height_px = padding * 2 + n_lignes * line_h + 80

            # ---- Image ----
            img = Image.new("RGB", (width_px, height_px), color="white")
            draw = ImageDraw.Draw(img)

            # ---- Polices ----
            try:
                font_normal = ImageFont.truetype("arial.ttf", 18)
                font_bold   = ImageFont.truetype("arialbd.ttf", 20)
                font_small  = ImageFont.truetype("arial.ttf", 14)
                font_tiny   = ImageFont.truetype("arial.ttf", 13)
            except Exception:
                font_normal = ImageFont.load_default()
                font_bold   = font_normal
                font_small  = font_normal
                font_tiny   = font_normal

            cx = width_px // 2
            y = padding

            # ---- Adresse (petite, centrée) comme image 1 ----
            draw.text((cx, y), "Antananarivo, Madagascar",
                    font=font_tiny, fill="black", anchor="mt")
            y += line_h - 4
            draw.text((cx, y), "Tel: 034 XX XXX XX",
                    font=font_tiny, fill="black", anchor="mt")
            y += line_h

            # ---- Nom magasin dans cadre épais ----
            box_h = 32
            draw.rectangle([10, y, width_px - 10, y + box_h], outline="black", width=2)
            draw.text((cx, y + 6), "KOJAKOJA", font=font_bold, fill="black", anchor="mt")
            y += box_h + 8

            # ---- Date ----
            JOURS_FR = {"Monday":"Lun","Tuesday":"Mar","Wednesday":"Mer","Thursday":"Jeu","Friday":"Ven","Saturday":"Sam","Sunday":"Dim"}
            jour_fr = JOURS_FR[datetime.now().strftime("%A")]
            date_str = f"{jour_fr}  {datetime.now().strftime('%d/%m/%Y  %H:%M')}"
            draw.text((cx, y), date_str,
                font=font_small, fill="black", anchor="mt")
            y += line_h + 4

            # ---- Séparateur pointillé ----
            self._draw_png_dashed_line(draw, 10, y, width_px - 10)
            y += 10

            # ---- Articles avec numéro de référence comme image 1 ----
            for i, (nom, qte, sous_total) in enumerate(items, start=1):
                ref = f"{i:02d}-{i*111:03d}"        # ex: 01-111, 02-222
                label = f"{ref}  {nom[:16]} x{qte}"
                draw.text((10, y), label, font=font_normal, fill="black")
                draw.text((width_px - 10, y), self._format_money_ar(sous_total),
                        font=font_normal, fill="black", anchor="ra")
                y += line_h

            # ---- Séparateur pointillé ----
            y += 4
            self._draw_png_dashed_line(draw, 10, y, width_px - 10)
            y += 10

            # ---- Total (bold gauche + droite) ----
            draw.text((10, y), "TOTAL:", font=font_bold, fill="black")
            draw.text((width_px - 10, y), self._format_money_ar(total),
                    font=font_bold, fill="black", anchor="ra")
            y += line_h + 6

            # ---- Séparateur final simple ----
            self._draw_png_dashed_line(draw, 10, y, width_px - 10)
            y += 12

            # ---- Message fin centré ----
            draw.text((cx, y), "Merci de votre visite !",
                    font=font_small, fill="black", anchor="mt")

            # ---- Sauvegarde ----
            filename = f"ticket_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            full_path = os.path.join(FACTURES_DIR, filename)
            img.save(full_path, "PNG", dpi=(DPI, DPI))

            return {
                "success": True,
                "filename": filename,
                "path": full_path
            }
        except Exception as e:
            return {"success": False, "message": f"Erreur génération PNG : {e}"}


# -------------------------
# Classe API
# -------------------------
class API:
    def __init__(self, db_path=DB_PATH):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.create_tables()
        self.print_api = PrintApi()

    def create_tables(self):
        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS produits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT,
            caracteristique TEXT,
            prix_achat REAL,
            prix_vente REAL,
            image TEXT,
            quantite INTEGER,
            place TEXT
        )
        """)
        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS ventes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produit_id INTEGER,
            quantite_vendue INTEGER,
            date_vente TEXT,
            facture_id INTEGER
        )
        """)
        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS factures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date_facture TEXT DEFAULT CURRENT_TIMESTAMP,
            total REAL DEFAULT 0
        )
        """)
        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contenu TEXT,
            date_creation TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)
        self.cursor.execute("PRAGMA table_info(ventes)")
        columns = [col[1] for col in self.cursor.fetchall()]
        if 'facture_id' not in columns:
            try:
                self.cursor.execute(
                    "ALTER TABLE ventes ADD COLUMN facture_id INTEGER REFERENCES factures(id)"
                )
                self.conn.commit()
            except Exception:
                pass
        self.conn.commit()

    # -------------------------
    # Utilitaires système
    # -------------------------
    def ouvrir_pdf(self, path):
        """Ouvre un fichier avec le lecteur par défaut du système."""
        try:
            if platform.system() == "Windows":
                os.startfile(path)
            elif platform.system() == "Darwin":
                subprocess.run(["open", path])
            else:
                subprocess.run(["xdg-open", path])
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": str(e)}

    # -------------------------
    # PRODUITS CRUD
    # -------------------------
    def ajouter_produit(self, nom, caracteristique, prix_achat, prix_vente, image, quantite, place):
        try:
            prix_achat = float(prix_achat)
            prix_vente = float(prix_vente)
            quantite = int(quantite)
            if any(val < 0 for val in [prix_achat, prix_vente, quantite]):
                return {'success': False, 'message': 'Les prix et la quantité doivent être positifs.'}
            self.cursor.execute("""
                INSERT INTO produits (nom, caracteristique, prix_achat, prix_vente, image, quantite, place)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (nom, caracteristique, prix_achat, prix_vente, image, quantite, place))
            self.conn.commit()
            return {'success': True, 'message': 'Produit ajouté avec succès.'}
        except ValueError:
            return {'success': False, 'message': 'Format invalide pour les prix ou la quantité.'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def lister_produits(self):
        try:
            self.cursor.execute("SELECT * FROM produits")
            rows = self.cursor.fetchall()
            keys = ['id', 'nom', 'caracteristique', 'prix_achat', 'prix_vente', 'image', 'quantite', 'place']
            return {'success': True, 'produits': [dict(zip(keys, row)) for row in rows]}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def get_total_articles(self):
        try:
            self.cursor.execute("SELECT SUM(quantite) FROM produits")
            result = self.cursor.fetchone()[0]
            return {'success': True, 'total_articles': result if result is not None else 0}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def get_stats(self):
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            month = datetime.now().strftime("%Y-%m")

            self.cursor.execute("""
                SELECT SUM((prix_vente - prix_achat) * quantite_vendue)
                FROM ventes JOIN produits ON ventes.produit_id = produits.id
                WHERE DATE(date_vente) = ?
            """, (today,))
            benefices_jour = self.cursor.fetchone()[0] or 0

            self.cursor.execute("""
                SELECT SUM((prix_vente - prix_achat) * quantite_vendue)
                FROM ventes JOIN produits ON ventes.produit_id = produits.id
                WHERE strftime('%Y-%m', date_vente) = ?
            """, (month,))
            benefices_mois = self.cursor.fetchone()[0] or 0

            self.cursor.execute("""
                SELECT SUM(prix_vente * quantite_vendue)
                FROM ventes JOIN produits ON ventes.produit_id = produits.id
                WHERE strftime('%Y-%m', date_vente) = ?
            """, (month,))
            ventes_mois = self.cursor.fetchone()[0] or 0

            self.cursor.execute("""
                SELECT produits.nom,
                    SUM(ventes.quantite_vendue) AS total_vendu,
                    SUM(ventes.quantite_vendue * produits.prix_vente) AS total_montant
                FROM ventes JOIN produits ON ventes.produit_id = produits.id
                WHERE strftime('%Y-%m', ventes.date_vente) = ?
                GROUP BY produits.nom
                ORDER BY total_vendu DESC LIMIT 5
            """, (month,))
            produits_plus_vendus = [
                {"nom": nom, "quantite": qte, "montant": montant}
                for nom, qte, montant in self.cursor.fetchall()
            ]

            return {
                'success': True,
                'benefices_jour': benefices_jour,
                'benefices_mois': benefices_mois,
                'ventes_mois': ventes_mois,
                'produits_plus_vendus': produits_plus_vendus
            }
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def rechercher_produit(self, nom):
        try:
            self.cursor.execute(
                "SELECT * FROM produits WHERE LOWER(nom) LIKE ? LIMIT 1",
                ('%' + nom.lower() + '%',)
            )
            row = self.cursor.fetchone()
            if not row:
                return {}
            keys = ['id', 'nom', 'caracteristique', 'prix_achat', 'prix_vente', 'image', 'quantite', 'place']
            return dict(zip(keys, row))
        except Exception as e:
            return {'error': str(e)}

    def get_produit_by_id(self, id):
        try:
            self.cursor.execute("SELECT * FROM produits WHERE id = ?", (id,))
            row = self.cursor.fetchone()
            if not row:
                return {'error': 'Produit introuvable'}
            keys = ['id', 'nom', 'caracteristique', 'prix_achat', 'prix_vente', 'image', 'quantite', 'place']
            return dict(zip(keys, row))
        except Exception as e:
            return {'error': str(e)}

    def modifier_produit(self, data):
        try:
            self.cursor.execute("""
                UPDATE produits SET
                nom = ?, caracteristique = ?, place = ?,
                prix_achat = ?, prix_vente = ?, quantite = ?
                WHERE id = ?
            """, (
                data['nom'], data['caracteristique'], data['place'],
                float(data['prix_achat']), float(data['prix_vente']),
                int(data['quantite']), int(data['id'])
            ))
            self.conn.commit()
            return {'success': True, 'message': 'Produit modifié avec succès'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def get_produits_stock_faible(self, seuil=5):
        try:
            self.cursor.execute("SELECT nom, quantite FROM produits WHERE quantite <= ?", (seuil,))
            return {'success': True, 'data': [{'nom': r[0], 'quantite': r[1]} for r in self.cursor.fetchall()]}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def supprimer_produit(self, produit_id):
        try:
            self.cursor.execute("DELETE FROM produits WHERE id = ?", (produit_id,))
            self.conn.commit()
            return {'success': True, 'message': 'Produit supprimé avec succès.'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    # -------------------------
    # Ventes
    # -------------------------
    def _enregistrer_bdd(self, panier):
        """Enregistre la vente en BDD (utilisé par enregistrer_vente et enregistrer_vente_png)."""
        with self.conn:
            cur = self.conn.cursor()
            cur.execute("INSERT INTO factures (date_facture) VALUES (?)",
                        (datetime.now().strftime("%Y-%m-%d %H:%M:%S"),))
            facture_id = cur.lastrowid
            for prod in panier:
                produit = self.rechercher_produit(prod["nom"])
                if not produit:
                    continue
                qte = int(prod.get("quantiteAchat", 1))
                cur.execute("""
                    INSERT INTO ventes (produit_id, quantite_vendue, date_vente, facture_id)
                    VALUES (?, ?, ?, ?)
                """, (produit["id"], qte, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), facture_id))
                cur.execute("UPDATE produits SET quantite = quantite - ? WHERE id = ?",
                            (qte, produit["id"]))

    def enregistrer_vente(self, panier_json):
        """Enregistre la vente en BDD et génère le PDF."""
        try:
            panier = json.loads(panier_json)
            if not panier:
                return {"success": False, "message": "Panier vide."}
            self._enregistrer_bdd(panier)
            return self.print_api.generer_ticket_pdf(panier)
        except Exception as e:
            return {"success": False, "message": f"Erreur enregistrement : {e}"}

    def enregistrer_vente_png(self, panier_json):
        """Enregistre la vente en BDD et génère un PNG pour impression smartphone."""
        try:
            panier = json.loads(panier_json)
            if not panier:
                return {"success": False, "message": "Panier vide."}
            self._enregistrer_bdd(panier)
            return self.print_api.generer_ticket_png(panier)
        except Exception as e:
            return {"success": False, "message": f"Erreur enregistrement PNG : {e}"}

    def previsualiser_pdf(self, panier):
        """Génère un PDF de prévisualisation SANS enregistrer en BDD."""
        try:
            result = self.print_api.generer_ticket_pdf(panier)
            if result["success"]:
                self.ouvrir_pdf(result["path"])
            return result
        except Exception as e:
            return {"success": False, "message": str(e)}

    # -------------------------
    # Historique
    # -------------------------
    def get_historique_ventes(self):
        try:
            aujourd_hui = datetime.now().strftime("%Y-%m-%d")
            hier = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

            def ventes_par_jour(jour):
                self.cursor.execute("""
                    SELECT p.nom, v.quantite_vendue, p.prix_vente
                    FROM ventes v JOIN produits p ON v.produit_id = p.id
                    WHERE DATE(v.date_vente) = ?
                """, (jour,))
                ventes, total = [], 0
                for nom, qte, prix in self.cursor.fetchall():
                    sous_total = qte * prix
                    ventes.append({'nom': nom, 'prix': sous_total})
                    total += sous_total
                return ventes, total

            ventes_auj, total_auj = ventes_par_jour(aujourd_hui)
            ventes_hier, total_hier = ventes_par_jour(hier)
            return {
                'success': True,
                'aujourdhui': ventes_auj, 'total_aujourdhui': total_auj,
                'hier': ventes_hier, 'total_hier': total_hier
            }
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def get_all_produits(self):
        try:
            self.cursor.execute("SELECT id, nom FROM produits")
            return {'success': True, 'produits': [{'id': p[0], 'nom': p[1]} for p in self.cursor.fetchall()]}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    # -------------------------
    # Notes
    # -------------------------
    def ajouter_notes(self, contenu):
        try:
            self.cursor.execute(
                "INSERT INTO notes (contenu, date_creation) VALUES (?, CURRENT_TIMESTAMP)", (contenu,)
            )
            self.conn.commit()
            return {'success': True, 'message': 'Note ajoutée avec succès.'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def lister_notes(self):
        try:
            self.cursor.execute(
                "SELECT id, contenu, date_creation FROM notes ORDER BY date_creation DESC"
            )
            keys = ['id', 'contenu', 'date_creation']
            return {'success': True, 'notes': [dict(zip(keys, row)) for row in self.cursor.fetchall()]}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def modifier_note(self, note_id, nouveau_contenu):
        try:
            self.cursor.execute("UPDATE notes SET contenu = ? WHERE id = ?", (nouveau_contenu, note_id))
            self.conn.commit()
            return {'success': True, 'message': 'Note modifiée avec succès.'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def supprimer_note(self, note_id):
        try:
            self.cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            self.conn.commit()
            return {'success': True, 'message': 'Note supprimée avec succès.'}
        except Exception as e:
            return {'success': False, 'message': str(e)}


# Instanciation exposée
api = API()