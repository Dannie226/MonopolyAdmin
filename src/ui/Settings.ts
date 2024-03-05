import { Vector3 } from "three";
import { controls, camera, intObjStart, intObjEnd } from "../game/Globals";
import { Tween } from "../libs/tween";

class Settings {
    private lightModeElements: Element[];
    private followPoints: {[name: string]: Vector3};
    private followOptions: HTMLSelectElement;

    public constructor() {
        const gameScreen = document.getElementById("game");

        this.lightModeElements = [];
        this.followPoints = {};

        const settingsWindow = document.createElementNS("http://www.w3.org/1999/xhtml", "div");

        const settingsButton = document.createElementNS("http://www.w3.org/1999/xhtml", "button");

        const settingsImage = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const gearOutside = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const gearInside = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const header = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const backButton = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
        const headerSpan = document.createElementNS("http://www.w3.org/1999/xhtml", "span");

        const headerPadding = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const darkModePanel = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const darkModeInput = document.createElementNS("http://www.w3.org/1999/xhtml", "input") as HTMLInputElement;

        const followPanel = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        this.followOptions = document.createElementNS("http://www.w3.org/1999/xhtml", "select") as HTMLSelectElement;

        gearOutside.setAttribute("d", "M491.584,192.579l-55.918-6.914c-0.919-2.351-1.884-4.682-2.892-6.993l34.648-44.428c7.227-9.267,6.412-22.464-1.899-30.773l-57.028-56.996c-8.308-8.304-21.502-9.114-30.763-1.893L333.32,79.216c-2.312-1.008-4.644-1.974-6.994-2.894l-6.915-55.904c-1.443-11.66-11.348-20.415-23.097-20.415h-80.637c-11.748,0-21.656,8.755-23.097,20.416l-6.914,55.904c-2.349,0.919-4.681,1.884-6.988,2.89l-44.415-34.642c-9.261-7.222-22.458-6.414-30.768,1.894l-57.021,57.009c-8.31,8.307-9.123,21.506-1.896,30.771l34.644,44.417c-1.012,2.312-1.978,4.647-2.9,7.002l-55.906,6.914C8.757,194.022,0,203.927,0,215.676v80.64c0,11.75,8.758,21.658,20.421,23.097l55.901,6.903c0.919,2.352,1.884,4.686,2.894,6.994l-34.641,44.417c-7.224,9.264-6.411,22.46,1.894,30.767l57.021,57.031c8.307,8.31,21.507,9.121,30.773,1.896l44.417-34.648c2.306,1.007,4.638,1.974,6.987,2.891l6.914,55.921c1.441,11.66,11.348,20.416,23.097,20.416h80.637c11.748,0,21.655-8.755,23.097-20.416l6.915-55.92c2.351-0.92,4.682-1.885,6.993-2.892l44.425,34.65c9.266,7.225,22.463,6.414,30.771-1.898l57.015-57.031c8.307-8.308,9.117-21.504,1.893-30.768l-34.641-44.409c1.012-2.313,1.978-4.647,2.898-7.002l55.901-6.903c11.661-1.44,20.421-11.348,20.421-23.097v-80.64C512,203.927,503.243,194.022,491.584,192.579z M465.455,275.74l-49.864,6.158c-9.151,1.131-16.772,7.556-19.431,16.386c-2.813,9.337-6.56,18.387-11.138,26.903c-4.367,8.124-3.525,18.063,2.147,25.335l30.898,39.613l-27.924,27.932l-39.621-30.905c-7.269-5.668-17.202-6.513-25.327-2.15c-8.513,4.572-17.565,8.319-26.905,11.134c-8.827,2.661-15.25,10.279-16.381,19.427l-6.169,49.883h-39.492l-6.167-49.883c-1.131-9.146-7.551-16.763-16.375-19.425c-9.367-2.825-18.417-6.571-26.899-11.132c-8.122-4.369-18.061-3.527-25.336,2.147l-39.615,30.902L93.929,390.13l30.897-39.618c5.671-7.273,6.513-17.206,2.147-25.328c-4.568-8.501-8.315-17.554-11.137-26.911c-2.662-8.825-10.282-15.247-19.43-16.376l-49.861-6.156v-39.492l49.866-6.167c9.146-1.131,16.763-7.551,19.423-16.375c2.824-9.356,6.572-18.406,11.143-26.9c4.374-8.124,3.533-18.067-2.143-25.342l-30.903-39.62l27.924-27.918l39.62,30.902c7.273,5.672,17.209,6.513,25.335,2.146c8.493-4.565,17.541-8.31,26.896-11.132c8.825-2.662,15.247-10.279,16.378-19.427l6.166-49.867h39.494l6.169,49.869c1.133,9.148,7.557,16.767,16.384,19.427c9.328,2.811,18.379,6.557,26.902,11.135c8.122,4.364,18.055,3.522,25.325-2.149l39.616-30.894l27.927,27.912l-30.897,39.618c-5.666,7.267-6.513,17.191-2.158,25.311c4.58,8.54,8.328,17.599,11.138,26.923c2.661,8.825,10.279,15.248,19.427,16.381l49.878,6.169V275.74z")
        gearInside.setAttribute("d", "M255.997,155.153c-55.606,0-100.845,45.244-100.845,100.856c0,55.603,45.239,100.839,100.845,100.839c55.609,0,100.852-45.236,100.852-100.839C356.849,200.397,311.606,155.153,255.997,155.153z M255.997,310.303c-29.941,0-54.3-24.356-54.3-54.294c0-29.947,24.359-54.311,54.3-54.311c29.944,0,54.306,24.363,54.306,54.311C310.303,285.947,285.941,310.303,255.997,310.303z")

        settingsImage.setAttribute("viewBox", "0 0 512 512");
        settingsImage.appendChild(gearOutside);
        settingsImage.appendChild(gearInside);

        settingsButton.id = "settingsButton";
        settingsButton.classList.add("settings", "uiButton");

        settingsImage.classList.add("settings", "uiButtonImage", "dark");

        settingsWindow.style.display = "none";
        settingsWindow.classList.add("settings", "windowElement", "dark");

        header.classList.add("settings", "windowHeader", "dark");
        
        backButton.innerHTML = "&#x2190;";
        backButton.classList.add("settings", "backButton", "dark");
        
        headerSpan.innerHTML = "Settings";
        headerSpan.classList.add("settings", "headerSpan");
        
        headerPadding.style.height = "5%";
        darkModePanel.innerHTML = "Dark Mode: ";
        darkModePanel.classList.add("settings", "panel", "dark");

        darkModeInput.setAttribute("type", "checkbox");
        darkModeInput.checked = true;
        darkModeInput.classList.add("settings");

        followPanel.innerHTML = "Follow: ";
        followPanel.classList.add("settings", "panel", "dark");

        this.followOptions.classList.add("settings", "dark");
        
        this.addFollowPoint("Center", new Vector3()).selected = true;

        let tw:Tween<{t:number}> = null;

        this.followOptions.addEventListener("change", (ev) => {
            const q1 = camera.quaternion.clone();
            controls.target = this.followPoints[this.followOptions.value];
            controls.update();
            const q2 = camera.quaternion.clone();

            if(tw != null) {
                tw.stop();
            }

            intObjStart.t = 0;
            intObjEnd.t = 1;

            controls.enabled = false;
            tw = new Tween(intObjStart).to(intObjEnd, 200).onUpdate(({t}) => {
                camera.quaternion.slerpQuaternions(q1, q2, t);
            }).start().onComplete(() => {
                tw = null;
                controls.enabled = true;
            });
        });

        this.addLightModeElements(settingsImage, settingsWindow);
        this.addLightModeElements(header, backButton);
        this.addLightModeElement(darkModePanel);
        this.addLightModeElements(followPanel, this.followOptions);

        settingsButton.appendChild(settingsImage);

        header.appendChild(backButton);
        header.appendChild(headerSpan);

        darkModePanel.appendChild(darkModeInput);

        followPanel.appendChild(this.followOptions);

        settingsWindow.appendChild(header);
        settingsWindow.appendChild(headerPadding);
        settingsWindow.appendChild(darkModePanel);
        settingsWindow.appendChild(followPanel);

        gameScreen.appendChild(settingsButton);
        gameScreen.appendChild(settingsWindow);


        settingsButton.addEventListener("click", function() {
            settingsWindow.style.display = "block";
        });

        backButton.addEventListener("click", function() {
            settingsWindow.style.display = "none";
        });

        const scope = this;

        darkModeInput.addEventListener("input", function() {
            if(darkModeInput.checked) {
                for(const element of scope.lightModeElements) {
                    element.classList.remove("light");
                    element.classList.add("dark");
                }
            } else {
                for(const element of scope.lightModeElements) {
                    element.classList.remove("dark");
                    element.classList.add("light");
                }
            }
        });
    }

    public addLightModeElement(element: Element): void {
        this.lightModeElements.push(element);
    }

    public addLightModeElements(...elements: Element[]): void {
        for(let i = 0; i < elements.length; i++) {
            this.lightModeElements.push(elements[i]);
        }
    }

    public removeLightModeElement(element: Element): void {
        const index = this.lightModeElements.indexOf(element);

        if(index > -1) {
            this.lightModeElements.splice(index, 1);
        }
    }

    public addFollowPoint(name: string, point: Vector3) {
        if(!(name in this.followPoints)) {
            this.followPoints[name] = point;

            const option = document.createElement("option");
            option.value = name;
            option.innerHTML = name;

            return this.followOptions.appendChild(option);
        }

        return null;
    }
}

export { Settings };