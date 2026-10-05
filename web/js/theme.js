const body = document.body;
const toggleTheme = document.querySelector(".toggle-theme");
const light = toggleTheme.children[0];
const dark = toggleTheme.children[1];

toggleTheme.addEventListener("click", chageTheme);//lorsqu'on clique on lance la fonction chageTheme

function chageTheme() {
    if(body.classList.contains("dark-mode")){//on va tester si la classe dark-mode existe dansle body
        lightMode();//on va lancer la classe lightMode;
    } else if(!body.classList.contains("dark-mode")){//si elle ne contient pas la classe dark-mode
        darkMode();
    }
}

if(window.matchMedia("prefers-color-scheme: dark").matches){//lancer le site en fonction de la navigateur du client 
    // s'il utilise dark ou light
    darkMode();
}

function lightMode() {//function lightMode 
    body.classList.remove("dark-mode");//fafana dark-mode
    light.classList.add("active");//apina active le light
    dark.classList.remove("active");//de fafana classe active dark
}

function darkMode() {//contraire lightMode 
    body.classList.add("dark-mode");
    light.classList.remove("active");
    dark.classList.add("active");
}
