import webview
from backend import api
import os

dir_path = os.path.abspath(os.path.dirname(__file__))
index_path = os.path.join(dir_path, 'web', 'index.html')

if __name__ == '__main__':
    window = webview.create_window(
        title='Kojakoja - Gestion de stock',
        url=index_path,
        js_api=api,
        width=1380,
        height=900
    )
    webview.start(debug=True)
