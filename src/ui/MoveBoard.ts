import { Settings } from "./Settings";

class MoveBoard {
    constructor(settings: Settings) {
        const moveElement = document.createElementNS("http://www.w3.org/1999/xhtml", "div");

        const moveButton = document.createElementNS("http://www.w3.org/1999/xhtml", "button");

        const moveButtonImage = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const moveHeader = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const backButton = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
        const headerSpan = document.createElementNS("http://www.w3.org/1999/xhtml", "span");

        const movesWindow = document.createElementNS("http://www.w3.org/1999/xhtml", "div");

        const rollButton = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const tradeButton = document.createElementNS("http://www.w3.org/1999/xhtml", "div");

        pathElem.setAttribute("fill", "none");
        pathElem.setAttribute("stroke-width", "10");
        pathElem.setAttribute("d", "M 40,10 a 10,10 0 0 0 0,30 a 10,10 0 0 0 0,-30 M 20,75 C 30,30 50,30 60,75 Z");

        moveElement.id = "moveElement";
        moveElement.classList.add("move", "dark", "windowElement");
        moveElement.style.display = "none";

        moveButton.id = "moveButton";
        moveButton.classList.add("move", "uiButton");

        moveButtonImage.setAttribute("viewBox", "-10 -5 100 100");
        moveButtonImage.id = "moveButtonImage";
        moveButtonImage.classList.add("move", "dark", "uiButtonImage");

        moveHeader.classList.add("move", "dark", "windowHeader");
        
        backButton.innerHTML = "&#x2190;";
        backButton.classList.add("move", "dark", "backButton");

        headerSpan.innerHTML = "Move Board";
        headerSpan.classList.add("move", "headerSpan");

        movesWindow.classList.add("move", "window");

        rollButton.innerHTML = "Roll";
        rollButton.classList.add("move", "panel", "dark");

        tradeButton.innerHTML = "Trade";
        tradeButton.classList.add("move", "panel", "dark");

        settings.addLightModeElements(moveElement, moveButtonImage, moveHeader, backButton, rollButton, tradeButton);

        moveButtonImage.appendChild(pathElem);

        moveButton.appendChild(moveButtonImage);

        moveHeader.appendChild(backButton);
        moveHeader.appendChild(headerSpan);

        movesWindow.appendChild(rollButton);
        movesWindow.appendChild(tradeButton);

        moveElement.appendChild(moveHeader);
        moveElement.appendChild(movesWindow);

        document.body.appendChild(moveButton);
        document.body.appendChild(moveElement);

        moveButton.addEventListener("click", function() {
            moveElement.style.display = "block";
        });

        backButton.addEventListener("click", function() {
            moveElement.style.display = "none"
        });


    }
}

export { MoveBoard };