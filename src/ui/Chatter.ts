import { SocketCommunicator, DataType } from "../server/SocketCommunicator";
import { Settings } from "./Settings";

class Chatter {

    public constructor(communicator: SocketCommunicator, settings: Settings, clientName: string, existingNames: string[]) {
        const gameScreen = document.getElementById("game");

        // UI elements
        const chatElement = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        
        const chatButton = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
        const chatButtonImage = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        const chatHeader = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const backButton = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
        const headerSpan = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
        const nameSpan = document.createElementNS("http://www.w3.org/1999/xhtml", "span");

        const mainWindow = document.createElementNS("http://www.w3.org/1999/xhtml", "div");

        const messagesWindow = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const messagesElement = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        const messageInput = document.createElementNS("http://www.w3.org/1999/xhtml", "input") as HTMLInputElement;

        const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElem.setAttribute("fill", "none");
        pathElem.setAttribute("stroke-width", "10");
        pathElem.setAttribute("d", "M 10,30 q 0,-10 10,-10 h 60 q 10,0 10,10 v 60 l -10,-10 h -60 q -10,0 -10,-10 v -50");
        
        chatElement.id = "chatElement";
        chatElement.classList.add("chatter", "dark", "windowElement");
        chatElement.style.display = "none";
        
        chatButton.id = "chatButton";
        chatButton.dataset.hangingMessages = "0";
        chatButton.classList.add("chatter", "uiButton");
        
        chatButtonImage.setAttribute("viewBox", "-10 -10 120 120");
        chatButtonImage.id = "chatButtonImage";
        chatButtonImage.classList.add("chatter", "dark", "uiButtonImage");

        chatHeader.classList.add("chatter", "dark", "windowHeader");
        
        backButton.innerHTML = "&#x2190;";
        backButton.classList.add("chatter", "dark", "backButton");

        headerSpan.innerHTML = "Chatter";
        headerSpan.classList.add("chatter", "headerSpan");

        nameSpan.innerHTML = clientName;
        nameSpan.id = "chatNameSpan";
        nameSpan.classList.add("chatter");

        mainWindow.id = "mainWindow";
        mainWindow.classList.add("chatter", "window");

        messagesWindow.id = "messagesWindow";
        messagesWindow.classList.add("chatter", "window");
        messagesWindow.style.display = "none";

        messagesElement.id = "messagesElement";
        messagesElement.classList.add("chatter", "dark");

        messageInput.id = "messagesInput";
        messageInput.classList.add("chatter", "dark");

        settings.addLightModeElements(chatElement, chatButtonImage, chatHeader, backButton, messagesElement, messageInput);

        chatHeader.appendChild(backButton);
        chatHeader.appendChild(headerSpan);
        chatHeader.appendChild(nameSpan);

        chatButtonImage.appendChild(pathElem);
        chatButton.appendChild(chatButtonImage);

        messagesWindow.appendChild(messageInput);
        messagesWindow.appendChild(messagesElement);

        chatElement.appendChild(chatHeader);
        chatElement.appendChild(mainWindow);
        chatElement.appendChild(messagesWindow);

        gameScreen.appendChild(chatButton);
        gameScreen.appendChild(chatElement);

        
        chatButton.addEventListener("click", function() {
            chatElement.style.display = "block"; 
        });
        
        let returnWindow = null;
        backButton.addEventListener("click", function() {
            if(returnWindow == null) {
                chatElement.style.display = "none";
            } else {
                returnWindow.style.display = "none";
                mainWindow.style.display = "block";
                headerSpan.innerHTML = "Chatter";

                returnWindow = null;
            }
        });
        
        // Chat app w/ server side
        
        const messages: {[name: string]: string} = {

        };
        
        const people: {[name: string]: HTMLElement} = {

        };
        
        let selectedPerson = null;

        function messageClick(ev: MouseEvent) {
            messagesWindow.style.display = "block";
            mainWindow.style.display = "none";

            const target = ev.target as HTMLElement;
            selectedPerson = target.dataset.name;
            headerSpan.innerHTML = selectedPerson;
            messagesElement.innerText = messages[selectedPerson];
            target.innerHTML = selectedPerson;
            messagesDecrease(chatButton, +target.dataset.hangingMessages);
            if(chatButton.dataset.hangingMessages == "0") {
                pathElem.setAttribute("fill", "none");
            }

            target.dataset.hangingMessages = "0";
            
            returnWindow = messagesWindow;
        }

        function addPerson(name: string) {
            const personButton = document.createElementNS("http://www.w3.org/1999/xhtml", "button");

            personButton.innerHTML = name;
            personButton.dataset.name = name;
            personButton.dataset.hangingMessages = "0";
            personButton.classList.add("chatter", "panel", "dark");

            personButton.addEventListener("click", messageClick);
            
            messages[name] = "";
            people[name] = personButton;

            settings.addLightModeElement(personButton);
            mainWindow.appendChild(personButton);
        }

        function messagesIncrement(element: HTMLElement) {
            element.dataset.hangingMessages = (+element.dataset.hangingMessages + 1).toString();
        }

        function messagesDecrease(element: HTMLElement, amount: number) {
            element.dataset.hangingMessages = (+element.dataset.hangingMessages - amount).toString();
        }

        communicator.addListener(DataType.ADD, (data) => {
            addPerson(data.name);
        });

        communicator.addListener(DataType.REMOVE, (data) => {
            people[data.name].remove();
            settings.removeLightModeElement(people[data.name]);
            delete messages[data.name];
            delete people[data.name];

            if(selectedPerson == data.name) {
                backButton.click();
                messageInput.blur();
                selectedPerson = null;
            }
        });

        communicator.addListener(DataType.EVERYONE_MESSAGE, (data) => {
            messages["Everyone"] += `[${data.from}]: ${data.message}\n`;
            if(selectedPerson == "Everyone") {
                messagesElement.innerText = messages["Everyone"];
            } else {
                messagesIncrement(people["Everyone"]);
                messagesIncrement(chatButton);

                people["Everyone"].innerHTML = `Everyone (${people["Everyone"].dataset.hangingMessages})`;
                pathElem.setAttribute("fill", "red");
            }
        });

        communicator.addListener(DataType.DIRECT_MESSAGE, (data) => {
            if(data.sending) {
                messages[data.to] += `[${data.from}]: ${data.message}\n`
                if(selectedPerson == data.to) {
                    messagesElement.innerText = messages[data.to];
                } else {
                    const person = people[data.to];
                    messagesIncrement(person);
                    messagesIncrement(chatButton);

                    person.innerHTML = `${person.dataset.name} (${person.dataset.hangingMessages})`;
                    pathElem.setAttribute("fill", "red");
                }
            } else {
                messages[data.from] += `[${data.from}]: ${data.message}\n`;

                if(selectedPerson == data.from) {
                    messagesElement.innerText = messages[data.from];
                } else {
                    const person = people[data.from];
                    messagesIncrement(person);
                    messagesIncrement(chatButton);

                    person.innerHTML = `${person.dataset.name} (${person.dataset.hangingMessages})`;
                    pathElem.setAttribute("fill", "red");
                }
            }
        });

        addPerson("Everyone");

        for(let i = 0; i < existingNames.length; i++) {
            addPerson(existingNames[i]);
        }

        messageInput.addEventListener("keydown", function(ev) {
            if(ev.key == "Enter") {
                if(selectedPerson == "Everyone") {
                    communicator.sendData(DataType.EVERYONE_MESSAGE, {
                        sending: true,
                        from: clientName,
                        message: messageInput.value
                    });
                } else {
                    communicator.sendData(DataType.DIRECT_MESSAGE, {
                        sending: true,
                        from: clientName,
                        to: selectedPerson,
                        message: messageInput.value
                    });
                }

                messageInput.value = "";
            }
        });

        backButton.addEventListener("click", function(ev) {
            selectedPerson = null;
        });
    }
}

export { Chatter };