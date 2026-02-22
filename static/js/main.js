
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', e => {
            const target = link.getAttribute('href');

            if (target === '#hs-lookup') {
                e.preventDefault();
                document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    const input = document.getElementById('hsCode');
                    if (input) {
                        input.focus();
                        input.style.outline = '2px solid #FF8C42';
                        input.style.transition = 'outline 0.3s';
                        setTimeout(() => { input.style.outline = ''; }, 1800);
                    }
                }, 500);
            }

            if (target === '#compliance') {
                e.preventDefault();
                document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    const btn = document.getElementById('compliance');
                    if (btn) {
                        btn.style.transform = 'scale(1.04)';
                        btn.style.boxShadow = '0 0 0 4px rgba(255,140,66,0.4)';
                        setTimeout(() => {
                            btn.style.transform = '';
                            btn.style.boxShadow = '';
                        }, 1200);
                    }
                }, 500);
            }

            if (target === '#routes') {
                e.preventDefault();
                const map = document.getElementById('mapContainer');
                if (map && map.style.display !== 'none') {
                    map.scrollIntoView({ behavior: 'smooth' });
                } else {

                    document.getElementById('analysis')?.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});



let isChatOpen = false;

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    isChatOpen = !isChatOpen;
    chatWindow.style.display = isChatOpen ? 'flex' : 'none';
    if (isChatOpen) {
        document.getElementById('chatInput').focus();
    }
}

function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const inputField = document.getElementById('chatInput');
    const message = inputField.value.trim();
    if (!message) return;


    appendMessage(message, 'user-message');
    inputField.value = '';


    const loadingId = 'chat-loading-' + Date.now();
    appendLoader(loadingId);


    fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message }),
    })
        .then(response => response.json())
        .then(data => {
            removeLoader(loadingId);


            let parsedJson = extractJsonFromLangflow(data);


            let rawText = parsedJson.message2 || parsedJson.message1;
            let resultText = typeof marked !== 'undefined' ? marked.parse(rawText) : rawText;

            appendMessage(resultText, 'bot-message');
        })
        .catch((error) => {
            console.error('Error:', error);
            removeLoader(loadingId);
            appendMessage("Sorry, I'm having trouble connecting right now.", 'bot-message');
        });
}

function appendMessage(text, className) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerHTML = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendLoader(id) {
    const chatMessages = document.getElementById('chatMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.id = id;
    loadingDiv.innerHTML = '<i class="fas fa-ellipsis-h fa-fade"></i>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoader(id) {
    const loader = document.getElementById(id);
    if (loader) loader.remove();
}

function parseResponse(data) {
    console.log("Raw API Response:", data);

    let text = "I didn't understand that. (Check console for details)";
    try {

        if (data.outputs && data.outputs[0].outputs && data.outputs[0].outputs[0].results) {
            const result = data.outputs[0].outputs[0].results;
            if (result.message && result.message.text) text = result.message.text.replace(/\n/g, '<br>');
            else if (result.message && result.message.data && result.message.data.text) text = result.message.data.text.replace(/\n/g, '<br>');
        }

        else if (data.result) text = data.result.replace(/\n/g, '<br>');
        else if (data.message) text = data.message.replace(/\n/g, '<br>');
    } catch (error) {
        console.error("Error parsing response:", error);
        text = "Error parsing response.";
    }


    const dutyMatch = text.match(/(?:base\s*duty|baseduty|basic\s*duty).*?(\d+(?:\.\d+)?)\s*%/i);
    if (dutyMatch) {
        const dutyValue = parseFloat(dutyMatch[1]);
        if (dutyValue > 20) {
            text += `<div style="color: #d32f2f; font-weight: 600; margin-top: 15px; border: 1px solid #fc8181; padding: 12px; border-radius: 8px; background: rgba(229, 62, 62, 0.1); display: flex; align-items: center; gap: 8px;"><i class="fas fa-exclamation-triangle"></i> Alert: Base duty is high (${dutyValue}%), be careful!</div>`;
        }
    }

    return text;
}


function extractJsonFromLangflow(data) {
    let rawText = "";
    try {
        if (data.outputs && data.outputs[0].outputs && data.outputs[0].outputs[0].results) {
            const result = data.outputs[0].outputs[0].results;
            rawText = result.message?.text || result.message?.data?.text || "";
        } else if (data.result) {
            rawText = data.result;
        } else if (data.message) {
            rawText = data.message;
        }
    } catch (e) { }

    if (!rawText) rawText = parseResponse(data);

    // Strip markdown code fences e.g. ```json ... ``` that LLMs often wrap around JSON
    rawText = rawText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsedJson = null;
    let cleanText = "";

    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');

    // If there's no JSON object in the text at all, return plain text directly
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        return { trigger: false, message1: "", message2: rawText.trim() };
    }

    cleanText = rawText.substring(startIndex, endIndex + 1);
    cleanText = cleanText.replace(/<br>/gi, '\\n');

    try {
        parsedJson = JSON.parse(cleanText);
    } catch (e) {
        console.warn("Strict JSON parse failed, attempting regex fallback:", e);

        parsedJson = { trigger: false, message1: "", message2: "" };

        const m1Match = cleanText.match(/"message1"\s*:\s*"([\s\S]*?)"\s*(?:,|})/);
        if (m1Match) parsedJson.message1 = m1Match[1].replace(/\\n/g, '\n').trim();

        const m2Match = cleanText.match(/"message2"\s*:\s*"([\s\S]*?)"\s*(?:,|})/);
        if (m2Match) parsedJson.message2 = m2Match[1].replace(/\\n/g, '\n').trim();

        const triggerMatch = cleanText.match(/"trigger"\s*:\s*(true|false)/i);
        if (triggerMatch) parsedJson.trigger = (triggerMatch[1].toLowerCase() === 'true');

        // If regex found nothing useful, fall back to the raw text as plain content
        if (!parsedJson.message1 && !parsedJson.message2) {
            parsedJson.message2 = rawText.trim();
        }
    }
    return parsedJson;
}


function processInput() {

    const hsCode = document.getElementById('hsCode').value;
    const actionType = document.getElementById('actionType').value;
    const quantity = parseInt(document.getElementById('quantity').value) || 0;
    const priceStr = document.getElementById('price').value;
    const unitPrice = priceStr ? parseFloat(priceStr) : 0;
    const originCountry = document.getElementById('originCountry').value;
    const destCountry = document.getElementById('destCountry').value;

    const isImport = actionType.trim().toLowerCase() === 'import';

    if (!hsCode || !actionType || !quantity || !originCountry || !destCountry) {
        alert("Please fill in all fields.");
        return;
    }

    if (!isImport && !priceStr) {
        alert("Please enter a Price Per Unit for exports.");
        return;
    }


    const payload = {
        hsCode: hsCode,
        quantity: quantity,
        unitPrice: unitPrice,
        originCountry: originCountry,
        destinationCountry: destCountry
    };

    console.log("Sending Payload:", payload);


    drawRoute(originCountry, destCountry);


    const mainResults = document.getElementById('mainResults');
    const resultCard = document.getElementById('resultCard');
    mainResults.style.display = 'block';


    resultCard.innerHTML = '<div class="loader"></div><p style="text-align:center; margin-top:10px;">Analyzing Global Trade Data...</p>';


    fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
        .then(response => response.json())
        .then(data => {

            document.body.classList.add('results-shown');


            let parsedJson = extractJsonFromLangflow(data);


            let resultHtml = '';


            if (parsedJson.message1 && parsedJson.message1.trim() !== "") {
                resultHtml += `
                    <h3 style="margin-bottom: 15px; color: var(--accent-black);">Analysis Result</h3>
                    <pre style="font-family: inherit; font-size: 1.1rem; line-height: 1.6; white-space: pre-wrap; background: transparent; border: none; padding: 0;">${parsedJson.message1}</pre>
                `;

                resultCard.innerHTML = resultHtml;


                const title = `${hsCode || 'HS'} · ${originCountry || ''} → ${destCountry || ''}`;
                let _usdTotal = unitPrice * quantity;

                const dutyMatch = parsedJson.message1 ? parsedJson.message1.match(/(?:base\s*duty|baseduty|basic\s*duty|duty applied).*?(\d+(?:\.\d+)?)\s*%/i) : null;
                if (dutyMatch) {
                    const dutyRate = parseFloat(dutyMatch[1]) / 100;
                    _usdTotal += (_usdTotal * dutyRate);
                }

                if (_usdTotal > 0) showCurrencyPanel(resultCard, _usdTotal, originCountry, destCountry);


                addReceiptBar(resultCard, parsedJson.message1, title);

            } else {

                resultCard.innerHTML = '<p>Query processed.</p>';
            }


            if (parsedJson.trigger === true && parsedJson.message2) {

                setTimeout(() => {

                    if (!isChatOpen && typeof openChatPanel === 'function') openChatPanel();
                    if (typeof toggleChat === 'function' && !isChatOpen && typeof openChatPanel === 'undefined') toggleChat();

                    const mdHtml = typeof marked !== 'undefined' ? marked.parse(parsedJson.message2) : parsedJson.message2;


                    if (document.getElementById('panelMessages')) {
                        appendPanelMessage(mdHtml, 'bot-message');
                    } else if (document.getElementById('chatMessages')) {
                        appendMessage(mdHtml, 'bot-message');
                    }
                }, 1000);
            } else if (!parsedJson.message1 && parsedJson.message2) {

                mapContainer.style.display = 'none';
                resultCard.innerHTML = '<p>Query passed to AI Advisor...</p>';
                setTimeout(() => { mainResults.style.display = 'none'; }, 1000);

                if (!isChatOpen && typeof openChatPanel === 'function') openChatPanel();
                if (typeof toggleChat === 'function' && !isChatOpen && typeof openChatPanel === 'undefined') toggleChat();

                const mdHtml = typeof marked !== 'undefined' ? marked.parse(parsedJson.message2) : parsedJson.message2;

                if (document.getElementById('panelMessages')) {
                    appendPanelMessage(mdHtml, 'bot-message');
                } else if (document.getElementById('chatMessages')) {
                    appendMessage(mdHtml, 'bot-message');
                }
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            resultCard.innerHTML = '<p style="color:red; text-align:center;">Error processing request. Please try again.</p>';
        });
}




const countryCoords = {
    "China": { x: 790, y: 360, code: 'cn' },
    "USA": { x: 225, y: 275, code: 'us' },
    "India": { x: 710, y: 405, code: 'in' },
    "Vietnam": { x: 770, y: 420, code: 'vn' },
    "Germany": { x: 510, y: 300, code: 'de' },
    "UAE": { x: 627, y: 390, code: 'ae' },
    "UK": { x: 465, y: 285, code: 'gb' },
    "Canada": { x: 220, y: 195, code: 'ca' },
    "Australia": { x: 855, y: 510, code: 'au' },
    "Japan": { x: 858, y: 347, code: 'jp' },
    "South Korea": { x: 836, y: 354, code: 'kr' },
    "France": { x: 490, y: 318, code: 'fr' },
    "Italy": { x: 520, y: 330, code: 'it' },
    "Brazil": { x: 315, y: 475, code: 'br' },
    "Mexico": { x: 205, y: 375, code: 'mx' }
};


const ROUTE_COLORS = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502', '#a29bfe', '#fd79a8', '#ff6b81', '#eccc68'];

function drawRoute(origin, destination, color, skipClear) {
    const svg = document.getElementById('routeSvg');
    const mapContainer = document.getElementById('mapContainer');

    if (!skipClear) {

        const toRemove = svg.querySelectorAll('.route-pin, .route-line, .route-plane');
        toRemove.forEach(el => el.remove());
        Array.from(svg.children).forEach(child => {
            if (child.id !== 'mapLandmasses') child.remove();
        });
    }

    const routeColor = color || '#ff4757';


    const originKey = Object.keys(countryCoords).find(k => k.toLowerCase() === origin.trim().toLowerCase());
    const destKey = Object.keys(countryCoords).find(k => k.toLowerCase() === destination.trim().toLowerCase());

    console.log(`Mapping Route: ${origin} (${originKey}) -> ${destination} (${destKey}) [${routeColor}]`);

    if (!originKey || !destKey) {
        console.warn('Coordinates not found for', origin, destination);
        if (!skipClear) mapContainer.style.display = 'none';
        return;
    }

    mapContainer.style.display = 'block';

    const start = countryCoords[originKey];
    const end = countryCoords[destKey];


    function createPin(x, y, countryCode) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'route-pin');

        const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pinPath.setAttribute('d', 'M12 0c-4.4 0-8 3.6-8 8 0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8z');
        pinPath.setAttribute('fill', routeColor);
        pinPath.setAttribute('stroke', '#ffffff');
        pinPath.setAttribute('stroke-width', '2');
        pinPath.setAttribute('transform', `translate(${x - 12}, ${y - 24}) scale(1.2)`);
        pinPath.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))');

        const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        innerCircle.setAttribute('cx', x);
        innerCircle.setAttribute('cy', y - 16);
        innerCircle.setAttribute('r', '4');
        innerCircle.setAttribute('fill', 'white');

        const flag = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        flag.setAttribute('href', `https://flagcdn.com/w160/${countryCode}.png`);
        flag.setAttribute('x', x - 15);
        flag.setAttribute('y', y - 48);
        flag.setAttribute('width', '30');
        flag.setAttribute('height', '20');
        flag.setAttribute('class', 'waving-flag');
        flag.setAttribute('filter', 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))');

        group.appendChild(pinPath);
        group.appendChild(innerCircle);
        group.appendChild(flag);
        return group;
    }

    svg.appendChild(createPin(start.x, start.y, start.code));
    svg.appendChild(createPin(end.x, end.y, end.code));


    const colorIdx = ROUTE_COLORS.indexOf(routeColor);
    const curveLift = 50 + colorIdx * 18;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 - curveLift;


    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'route-line route-plane');
    path.setAttribute('stroke', routeColor);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-dasharray', '10,5');
    path.setAttribute('filter', `drop-shadow(0 0 3px ${routeColor}88)`);
    svg.appendChild(path);


    const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    iconGroup.setAttribute('class', 'route-plane');

    const plane = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    plane.setAttribute('d', 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z');
    plane.setAttribute('fill', routeColor);
    plane.setAttribute('transform', 'translate(-12, -12) rotate(90 12 12)');
    iconGroup.appendChild(plane);


    const staggerDelay = (colorIdx * 0.8) % 3;
    const animateMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
    animateMotion.setAttribute('dur', `${2.5 + colorIdx * 0.3}s`);
    animateMotion.setAttribute('repeatCount', 'indefinite');
    animateMotion.setAttribute('path', d);
    animateMotion.setAttribute('rotate', 'auto');
    animateMotion.setAttribute('begin', `${staggerDelay}s`);
    iconGroup.appendChild(animateMotion);

    svg.appendChild(iconGroup);
}


function drawAllCartRoutes(items) {
    const svg = document.getElementById('routeSvg');
    const mapContainer = document.getElementById('mapContainer');


    const toRemove = svg.querySelectorAll('.route-pin, .route-line, .route-plane');
    toRemove.forEach(el => el.remove());
    Array.from(svg.children).forEach(child => {
        if (child.id !== 'mapLandmasses') child.remove();
    });

    let anyDrawn = false;
    items.forEach((item, idx) => {
        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
        const originKey = Object.keys(countryCoords).find(k => k.toLowerCase() === item.origin.trim().toLowerCase());
        const destKey = Object.keys(countryCoords).find(k => k.toLowerCase() === item.dest.trim().toLowerCase());
        if (originKey && destKey) {
            drawRoute(item.origin, item.dest, color, true);
            anyDrawn = true;
        }
    });

    mapContainer.style.display = anyDrawn ? 'block' : 'none';
}


function showOptions(input) {
    const list = input.nextElementSibling;
    if (list && list.classList.contains('custom-options')) {

        const options = list.querySelectorAll('li');
        options.forEach(opt => opt.style.display = 'block');

        list.classList.remove('hidden');
    }
}

function hideOptions(input) {

    setTimeout(() => {
        const list = input.nextElementSibling;
        if (list && list.classList.contains('custom-options')) {
            list.classList.add('hidden');
        }
    }, 200);
}

function filterOptions(input) {
    const filter = input.value.toLowerCase();
    const list = input.nextElementSibling;
    const options = list.querySelectorAll('li');

    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        if (text.includes(filter)) {
            option.style.display = 'block';
        } else {
            option.style.display = 'none';
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const dropdowns = document.querySelectorAll('.custom-options');

    dropdowns.forEach(list => {
        list.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'LI') {
                e.preventDefault();

                const input = list.previousElementSibling;
                input.value = e.target.textContent;

                list.classList.add('hidden');


                if (input.id === 'actionType') {
                    updatePriceField(input.value);
                }
            }
        });
    });
});


function selectOption(inputId, value) {
    const input = document.getElementById(inputId);
    input.value = value;
    const list = input.nextElementSibling;
    if (list) list.classList.add('hidden');

    if (inputId === 'actionType') updatePriceField(value);
}


function updatePriceField(action) {
    const priceInput = document.getElementById('price');
    const priceGroup = document.getElementById('priceGroup');
    if (!priceInput || !priceGroup) return;


    priceInput.disabled = false;
    priceGroup.classList.remove('field-disabled');
    if (action.trim().toLowerCase() === 'import') {
        priceInput.placeholder = 'Import cost per unit (USD)';
    } else {
        priceInput.placeholder = 'Price Per Unit (USD)';
    }
}


function switchCodeType(type) {
    const input = document.getElementById('hsCode');
    document.querySelectorAll('.code-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.trim() === type + ' Code');
    });
    input.placeholder = type === 'HS'
        ? 'HS Code (e.g. 8517.12)'
        : 'HTS Code (e.g. 8517.12.00.00)';
    input.focus();
}


document.addEventListener('click', function (e) {
    if (!e.target.closest('.relative-container')) {
        document.querySelectorAll('.custom-options').forEach(el => el.classList.add('hidden'));
    }

    if (!e.target.closest('.user-pill')) {
        document.querySelector('.user-pill')?.classList.remove('dropdown-open');
    }
});


function openChatPanel() {
    document.getElementById('chatPanelOverlay').classList.add('open');
    document.getElementById('chatPanel').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('panelInput').focus(), 350);
}

function closeChatPanel() {
    document.getElementById('chatPanelOverlay').classList.remove('open');
    document.getElementById('chatPanel').classList.remove('open');
    document.body.style.overflow = '';
}

function handlePanelEnter(event) {
    if (event.key === 'Enter') sendPanelMessage();
}

function sendPanelMessage() {
    const input = document.getElementById('panelInput');
    const message = input.value.trim();
    if (!message) return;

    appendPanelMessage(message, 'user-message');
    input.value = '';


    const typingId = 'typing-' + Date.now();
    appendPanelTyping(typingId);

    fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
    })
        .then(r => r.json())
        .then(data => {
            removePanelTyping(typingId);

            let parsedJson = extractJsonFromLangflow(data);
            let rawText = parsedJson.message2 || parsedJson.message1;
            let resultText = typeof marked !== 'undefined' ? marked.parse(rawText) : rawText;

            appendPanelMessage(resultText, 'bot-message');
        })
        .catch(() => {
            removePanelTyping(typingId);
            appendPanelMessage("Sorry, I'm having trouble connecting right now.", 'bot-message');
        });
}

function appendPanelMessage(text, className) {
    const container = document.getElementById('panelMessages');
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerHTML = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function appendPanelTyping(id) {
    const container = document.getElementById('panelMessages');
    const div = document.createElement('div');
    div.className = 'message bot-message typing-dots';
    div.id = id;
    div.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removePanelTyping(id) {
    document.getElementById(id)?.remove();
}


function openSignInModal() {
    document.getElementById('gsiModalOverlay').classList.add('open');
}

function closeSignInModal() {
    document.getElementById('gsiModalOverlay').classList.remove('open');
}


function handleGoogleSignIn(response) {
    closeSignInModal();

    const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const name = payload.name || payload.given_name || 'User';
    const picture = payload.picture || '';


    document.getElementById('signInBtn').style.display = 'none';
    const pill = document.getElementById('userPill');
    pill.style.display = 'flex';
    document.getElementById('userAvatar').src = picture;
    document.getElementById('userAvatar').onerror = function () { this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=000&color=fff&size=60`; };
    document.getElementById('userName').textContent = name;


    window._gtUser = { name, picture };
}

function toggleUserDropdown() {
    document.getElementById('userPill').classList.toggle('dropdown-open');
}

function signOutUser() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    document.getElementById('userPill').style.display = 'none';
    document.getElementById('userPill').classList.remove('dropdown-open');
    document.getElementById('signInBtn').style.display = '';
    window._gtUser = null;
}


let tradeCart = [];

function addToCart() {
    const hsCode = document.getElementById('hsCode').value.trim();
    const actionType = document.getElementById('actionType').value.trim();
    const quantity = document.getElementById('quantity').value.trim();
    const price = document.getElementById('price').value.trim();
    const origin = document.getElementById('originCountry').value.trim();
    const dest = document.getElementById('destCountry').value.trim();
    const codeType = document.querySelector('.code-tab.active')?.textContent?.trim() || 'HS Code';
    const isImport = actionType.toLowerCase() === 'import';

    if (!hsCode || !actionType || !quantity || !origin || !dest) {
        alert('Please fill in HS Code, Action, Quantity, Origin & Destination before adding to cart.');
        return;
    }
    if (!isImport && !price) {
        alert('Please enter a Price Per Unit for exports.');
        return;
    }

    const totalValue = price ? (parseFloat(price) * parseFloat(quantity)).toFixed(2) : null;

    tradeCart.push({ hsCode, codeType, actionType, quantity, price, totalValue, origin, dest, id: Date.now() });
    renderCart();
    clearCartForm();
}

function renderCart() {
    const cartDiv = document.getElementById('tradeCart');
    const itemsDiv = document.getElementById('cartItems');
    const countEl = document.getElementById('cartCount');
    const summaryEl = document.getElementById('cartSummaryText');

    if (!tradeCart.length) { cartDiv.style.display = 'none'; return; }
    cartDiv.style.display = 'block';
    countEl.textContent = tradeCart.length;

    itemsDiv.innerHTML = tradeCart.map((item, idx) => `
        <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.7);border-radius:12px;padding:10px 14px;backdrop-filter:blur(6px);">
            <div style="flex:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px 14px;font-size:0.82rem;">
                <span><b>${item.codeType}:</b> ${item.hsCode}</span>
                <span><b>Action:</b> ${item.actionType}</span>
                <span><b>Qty:</b> ${item.quantity}</span>
                ${item.price ? `<span><b>Unit price:</b> $${item.price}</span>` : ''}
                ${item.totalValue ? `<span><b>Total:</b> <span style="color:#0a7a3e;font-weight:700;">$${parseFloat(item.totalValue).toLocaleString()}</span></span>` : ''}
                <span><b>From:</b> ${item.origin} → ${item.dest}</span>
            </div>
            <button onclick="removeFromCart(${item.id})" style="background:transparent;border:none;color:#e53e3e;cursor:pointer;font-size:1rem;padding:4px 8px;border-radius:8px;transition:background 0.2s;" onmouseover="this.style.background='rgba(229,62,62,0.1)'" onmouseout="this.style.background='transparent'">
                <i class="fas fa-times"></i>
            </button>
        </div>`
    ).join('');


    const totalShipment = tradeCart
        .filter(i => i.totalValue)
        .reduce((sum, i) => sum + parseFloat(i.totalValue), 0);

    summaryEl.innerHTML = `${tradeCart.length} product${tradeCart.length > 1 ? 's' : ''} in cart`
        + (totalShipment > 0 ? ` &nbsp;·&nbsp; Combined shipment value: <b style="color:#0a7a3e;">$${totalShipment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>` : '');
}

function removeFromCart(id) {
    tradeCart = tradeCart.filter(i => i.id !== id);
    renderCart();
}

function clearCart() {
    tradeCart = [];
    renderCart();
}

function clearCartForm() {
    ['hsCode', 'actionType', 'quantity', 'price', 'originCountry', 'destCountry'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.disabled = false; }
    });
    document.getElementById('priceGroup')?.classList.remove('field-disabled');
    document.getElementById('hsCode')?.focus();
}

function processCart() {
    if (!tradeCart.length) { alert('Your cart is empty. Add at least one product.'); return; }


    const productLines = tradeCart.map((item, idx) => {
        const priceText = item.price ? ` at $${item.price} USD per unit (total $${parseFloat(item.totalValue).toLocaleString()})` : '';
        return `Product ${idx + 1}: ${item.actionType} ${item.quantity} units of ${item.codeType} ${item.hsCode}${priceText} from ${item.origin} to ${item.dest}`;
    }).join('; ');

    const totalShipment = tradeCart
        .filter(i => i.totalValue)
        .reduce((sum, i) => sum + parseFloat(i.totalValue), 0);

    const combinedPrompt = `I have a multi-product shipment with ${tradeCart.length} items. ${productLines}. `
        + (totalShipment > 0 ? `Combined shipment value is $${totalShipment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. ` : '')
        + `Please provide: 1) Per-product tariffs and duties, 2) Combined landed cost total, 3) Any compliance or documentation requirements, 4) Trade route optimization tips if applicable.`;

    console.log('Multi-product prompt:', combinedPrompt);


    drawAllCartRoutes(tradeCart);


    const mainResults = document.getElementById('mainResults');
    const resultCard = document.getElementById('resultCard');
    mainResults.style.display = 'block';
    resultCard.innerHTML = `
        <div class="loader"></div>
        <p style="text-align:center;margin-top:10px;">Analysing ${tradeCart.length} products together…</p>`;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: combinedPrompt })
    })
        .then(r => r.json())
        .then(data => {

            document.body.classList.add('results-shown');

            const parsedJson = extractJsonFromLangflow(data);
            const displayText = parsedJson.message1 || parsedJson.message2 || 'Analysis complete.';
            const mdText = typeof marked !== 'undefined' ? marked.parse(displayText) : displayText;

            resultCard.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                <h3 style="color:var(--accent-black);margin:0;">Combined Trade Analysis</h3>
                <span style="background:#000;color:#fff;border-radius:20px;padding:3px 10px;font-size:0.78rem;">${tradeCart.length} products</span>
            </div>
            <div style="font-size:1rem;line-height:1.7;">${mdText}</div>`;


            const label = tradeCart.map(i => `${i.codeType} ${i.hsCode}`).join(', ');
            saveToHistory({
                title: label,
                type: 'multi',
                meta: `${tradeCart.length} products · ${tradeCart[0]?.origin} → ${tradeCart[0]?.dest}`,
                resultHtml: mdText,
                prompt: combinedPrompt
            });
            addReceiptBar(resultCard, mdText, label);


            const _cartSnapshot = [...tradeCart];
            _cartSnapshot.forEach(item => {
                if (item.totalValue && parseFloat(item.totalValue) > 0) {
                    let itemTotal = parseFloat(item.totalValue);
                    const dutyMatch = mdText ? mdText.match(/(?:base\s*duty|baseduty|basic\s*duty|duty applied).*?(\d+(?:\.\d+)?)\s*%/i) : null;
                    if (dutyMatch) {
                        const dutyRate = parseFloat(dutyMatch[1]) / 100;
                        itemTotal += (itemTotal * dutyRate);
                    }
                    showCurrencyPanel(resultCard, itemTotal, item.origin, item.dest);
                }
            });
        })
        .catch(() => {
            resultCard.innerHTML = '<p style="color:red;text-align:center;">Error processing request. Please try again.</p>';
        });
}



const HISTORY_KEY = () => {
    const user = window._gtUser;
    return user ? `gti_history_${user.email || user.name}` : null;
};

function saveToHistory(entry) {
    const key = HISTORY_KEY();
    if (!key) return;
    const history = getHistory();
    history.unshift({ ...entry, id: Date.now(), ts: new Date().toISOString() });
    if (history.length > 50) history.pop();
    localStorage.setItem(key, JSON.stringify(history));
}

function getHistory() {
    const key = HISTORY_KEY();
    if (!key) return [];
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function openHistoryPanel() {
    document.getElementById('historyPanelOverlay').classList.add('open');
    document.getElementById('historyPanel').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderHistoryList();
}

function closeHistoryPanel() {
    document.getElementById('historyPanelOverlay').classList.remove('open');
    document.getElementById('historyPanel').classList.remove('open');
    document.body.style.overflow = '';
}

function renderHistoryList() {
    const container = document.getElementById('historyList');
    const history = getHistory();
    if (!history.length) {
        container.innerHTML = `<div class="history-empty"><i class="fas fa-inbox"></i><p>No analyses yet.</p><p style="font-size:0.8rem;">Run a trade analysis to see it here.</p></div>`;
        return;
    }
    container.innerHTML = history.map(item => {
        const ago = timeAgo(item.ts);
        const badgeType = item.type === 'multi' ? '🛒 Cart' : '🔍 Single';
        return `
        <div class="history-item" onclick="showHistoryDetail(${item.id})">
            <div class="history-item-header">
                <span class="history-item-title">${escHtml(item.title)}</span>
                <span class="history-item-time">${ago}</span>
            </div>
            <div class="history-item-meta">
                <span class="history-item-badge">${badgeType}</span>
                ${escHtml(item.meta || '')}
            </div>
            <div class="history-item-result">${item.resultHtml || ''}</div>
        </div>`;
    }).join('');
}

function showHistoryDetail(id) {
    const history = getHistory();
    const item = history.find(h => h.id === id);
    if (!item) return;
    closeHistoryPanel();
    const content = document.getElementById('historyDetailContent');
    const isSignedIn = !!window._gtUser;
    const dlBtnClass = isSignedIn ? 'btn-download' : 'btn-download disabled';
    const dlLabel = isSignedIn ? '<i class="fas fa-download"></i> Download PDF' : '<i class="fas fa-lock"></i> Download PDF';
    content.innerHTML = `
        <div style="margin-bottom:18px;">
            <div style="font-size:1.1rem;font-weight:700;color:#111;margin-bottom:4px;">${escHtml(item.title)}</div>
            <div style="font-size:0.8rem;color:#999;">${new Date(item.ts).toLocaleString()} &nbsp;·&nbsp; ${item.meta || ''}</div>
        </div>
        <div id="receiptContent" style="font-size:0.95rem;line-height:1.7;">${item.resultHtml}</div>
        <div class="receipt-bar">
            <button class="${dlBtnClass}" onclick="downloadReceipt('pdf', '${escHtml(item.title)}')">${dlLabel}</button>
            <button class="${dlBtnClass}" onclick="downloadReceipt('jpeg', '${escHtml(item.title)}')" style="background:#333;">${isSignedIn ? '<i class="fas fa-image"></i> Download JPEG' : '<i class="fas fa-lock"></i> Download JPEG'}</button>
        </div>`;
    document.getElementById('historyDetailOverlay').classList.add('open');
}

function closeHistoryDetail() {
    document.getElementById('historyDetailOverlay').classList.remove('open');
}


function addReceiptBar(resultCard, resultHtml, title) {
    const isSignedIn = !!window._gtUser;
    const dlClass = isSignedIn ? 'btn-download' : 'btn-download disabled';
    const lockIcon = isSignedIn ? '' : '<i class="fas fa-lock" style="margin-right:4px;"></i>';
    const bar = document.createElement('div');
    bar.className = 'receipt-bar';
    bar.innerHTML = `
        <button class="${dlClass}" onclick="downloadFromResult('pdf', '${escHtml(title)}')">${lockIcon}<i class="fas fa-file-pdf"></i> Download PDF</button>
        <button class="${dlClass}" onclick="downloadFromResult('jpeg', '${escHtml(title)}')" style="background:${isSignedIn ? '#333' : ''}">${lockIcon}<i class="fas fa-image"></i> JPEG</button>
        ${!isSignedIn ? '<span style="font-size:0.8rem;color:#aaa;">Sign in to download</span>' : ''}`;
    resultCard.appendChild(bar);
}

function downloadFromResult(format, title) {
    if (!window._gtUser) { showToast('🔒 Sign in with Google required to download receipts.'); return; }
    downloadReceipt(format, title);
}

function downloadReceipt(format, title) {
    if (!window._gtUser) { showToast('🔒 Sign in with Google required to download receipts.'); return; }

    const source = document.getElementById('receiptContent') || document.getElementById('resultCard');
    if (!source) return;


    const node = document.createElement('div');
    node.style.cssText = 'font-family:Manrope,sans-serif;padding:32px;background:white;color:#111;width:720px;line-height:1.7;font-size:14px;';
    node.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #eee;">
            <div>
                <div style="font-size:20px;font-weight:800;">GlobalTrade AI — Receipt</div>
                <div style="font-size:12px;color:#888;margin-top:3px;">${title}</div>
            </div>
            <div style="text-align:right;font-size:12px;color:#aaa;">
                <div>${window._gtUser?.name || ''}</div>
                <div>${new Date().toLocaleString()}</div>
            </div>
        </div>
        <div>${source.innerHTML}</div>
        <div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#bbb;">
            Generated by GlobalTrade AI · globaltrade.ai
        </div>`;
    document.body.appendChild(node);

    html2canvas(node, { scale: 2, backgroundColor: '#fff', logging: false }).then(canvas => {
        document.body.removeChild(node);
        if (format === 'jpeg') {

            const link = document.createElement('a');
            link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_receipt.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.92);
            link.click();
        } else {

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const imgData = canvas.toDataURL('image/png');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = (canvas.height * pdfW) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
            pdf.save(`${title.replace(/[^a-z0-9]/gi, '_')}_receipt.pdf`);
        }
        showToast('✅ Receipt downloaded!');
    }).catch(() => showToast('⚠️ Download failed. Please try again.'));
}


let _toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('gtiToast');
    t.innerHTML = msg;
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}



const COUNTRY_CURRENCY = {

    'Afghanistan': 'AFN', 'Albania': 'ALL', 'Algeria': 'DZD', 'Argentina': 'ARS',
    'Armenia': 'AMD', 'Australia': 'AUD', 'Austria': 'EUR', 'Azerbaijan': 'AZN',
    'Bahrain': 'BHD', 'Bangladesh': 'BDT', 'Belarus': 'BYN', 'Belgium': 'EUR',
    'Bolivia': 'BOB', 'Brazil': 'BRL', 'Bulgaria': 'BGN', 'Cambodia': 'KHR',
    'Canada': 'CAD', 'Chile': 'CLP', 'China': 'CNY', 'Colombia': 'COP',
    'Croatia': 'EUR', 'Czech Republic': 'CZK', 'Denmark': 'DKK', 'Ecuador': 'USD',
    'Egypt': 'EGP', 'Estonia': 'EUR', 'Ethiopia': 'ETB', 'Finland': 'EUR',
    'France': 'EUR', 'Georgia': 'GEL', 'Germany': 'EUR', 'Ghana': 'GHS',
    'Greece': 'EUR', 'Guatemala': 'GTQ', 'Honduras': 'HNL', 'Hong Kong': 'HKD',
    'Hungary': 'HUF', 'Iceland': 'ISK', 'India': 'INR', 'Indonesia': 'IDR',
    'Iran': 'IRR', 'Iraq': 'IQD', 'Ireland': 'EUR', 'Israel': 'ILS',
    'Italy': 'EUR', 'Jamaica': 'JMD', 'Japan': 'JPY', 'Jordan': 'JOD',
    'Kazakhstan': 'KZT', 'Kenya': 'KES', 'Kuwait': 'KWD', 'Kyrgyzstan': 'KGS',
    'Laos': 'LAK', 'Latvia': 'EUR', 'Lebanon': 'LBP', 'Lithuania': 'EUR',
    'Luxembourg': 'EUR', 'Malaysia': 'MYR', 'Malta': 'EUR', 'Mexico': 'MXN',
    'Moldova': 'MDL', 'Mongolia': 'MNT', 'Morocco': 'MAD', 'Myanmar': 'MMK',
    'Nepal': 'NPR', 'Netherlands': 'EUR', 'New Zealand': 'NZD', 'Nicaragua': 'NIO',
    'Nigeria': 'NGN', 'North Korea': 'KPW', 'Norway': 'NOK', 'Oman': 'OMR',
    'Pakistan': 'PKR', 'Panama': 'PAB', 'Paraguay': 'PYG', 'Peru': 'PEN',
    'Philippines': 'PHP', 'Poland': 'PLN', 'Portugal': 'EUR', 'Qatar': 'QAR',
    'Romania': 'RON', 'Russia': 'RUB', 'Saudi Arabia': 'SAR', 'Serbia': 'RSD',
    'Singapore': 'SGD', 'Slovakia': 'EUR', 'Slovenia': 'EUR', 'South Africa': 'ZAR',
    'South Korea': 'KRW', 'Spain': 'EUR', 'Sri Lanka': 'LKR', 'Sweden': 'SEK',
    'Switzerland': 'CHF', 'Taiwan': 'TWD', 'Tajikistan': 'TJS', 'Tanzania': 'TZS',
    'Thailand': 'THB', 'Tunisia': 'TND', 'Turkey': 'TRY', 'Turkmenistan': 'TMT',
    'Uganda': 'UGX', 'Ukraine': 'UAH', 'United Arab Emirates': 'AED',
    'United Kingdom': 'GBP', 'United States': 'USD', 'Uruguay': 'UYU',
    'Uzbekistan': 'UZS', 'Venezuela': 'VES', 'Vietnam': 'VND',
    'Yemen': 'YER', 'Zimbabwe': 'ZWL',

    'UK': 'GBP', 'USA': 'USD', 'US': 'USD', 'UAE': 'AED',
    'S. Korea': 'KRW', 'Korea': 'KRW', 'N. Korea': 'KPW',
    'Russia': 'RUB', 'Czechia': 'CZK', 'Ivory Coast': 'XOF',
    'DR Congo': 'CDF', 'Tanzania': 'TZS', 'Laos': 'LAK',
};


const CURRENCY_COUNTRY_CODE = {
    'INR': 'in', 'CNY': 'cn', 'USD': 'us', 'EUR': 'eu', 'GBP': 'gb',
    'JPY': 'jp', 'AUD': 'au', 'CAD': 'ca', 'CHF': 'ch', 'SGD': 'sg',
    'HKD': 'hk', 'NZD': 'nz', 'KRW': 'kr', 'MYR': 'my', 'THB': 'th',
    'IDR': 'id', 'PHP': 'ph', 'VND': 'vn', 'BDT': 'bd', 'PKR': 'pk',
    'AED': 'ae', 'SAR': 'sa', 'QAR': 'qa', 'KWD': 'kw', 'BHD': 'bh',
    'TRY': 'tr', 'RUB': 'ru', 'ZAR': 'za', 'NGN': 'ng', 'KES': 'ke',
    'EGP': 'eg', 'MAD': 'ma', 'BRL': 'br', 'MXN': 'mx', 'ARS': 'ar',
    'CLP': 'cl', 'COP': 'co', 'SEK': 'se', 'NOK': 'no', 'DKK': 'dk',
    'PLN': 'pl', 'CZK': 'cz', 'HUF': 'hu', 'RON': 'ro', 'ILS': 'il',
    'TWD': 'tw', 'UAH': 'ua', 'KZT': 'kz', 'UZS': 'uz', 'LKR': 'lk',
    'NPR': 'np', 'MMK': 'mm', 'GEL': 'ge', 'AMD': 'am', 'AZN': 'az',
    'JOD': 'jo', 'OMR': 'om', 'GHS': 'gh', 'TZS': 'tz', 'UGX': 'ug',
    'ETB': 'et', 'EGP': 'eg', 'DZD': 'dz',
};

const CURRENCY_NAME = {
    'INR': 'Indian Rupee', 'CNY': 'Chinese Yuan', 'USD': 'US Dollar',
    'EUR': 'Euro', 'GBP': 'British Pound', 'JPY': 'Japanese Yen',
    'AUD': 'Australian Dollar', 'CAD': 'Canadian Dollar', 'SGD': 'Singapore Dollar',
    'AED': 'UAE Dirham', 'SAR': 'Saudi Riyal', 'MYR': 'Malaysian Ringgit',
    'THB': 'Thai Baht', 'IDR': 'Indonesian Rupiah', 'PHP': 'Philippine Peso',
    'VND': 'Vietnamese Dong', 'KRW': 'South Korean Won', 'PKR': 'Pakistani Rupee',
    'BDT': 'Bangladeshi Taka', 'ZAR': 'South African Rand', 'BRL': 'Brazilian Real',
    'MXN': 'Mexican Peso', 'TRY': 'Turkish Lira', 'RUB': 'Russian Ruble',
    'NGN': 'Nigerian Naira', 'EGP': 'Egyptian Pound', 'QAR': 'Qatari Riyal',
    'HKD': 'Hong Kong Dollar', 'NZD': 'New Zealand Dollar', 'CHF': 'Swiss Franc',
    'TWD': 'Taiwan Dollar', 'KWD': 'Kuwaiti Dinar', 'BHD': 'Bahraini Dinar',
    'ILS': 'Israeli Shekel', 'UAH': 'Ukrainian Hryvnia', 'LKR': 'Sri Lankan Rupee',
    'NPR': 'Nepalese Rupee', 'SEK': 'Swedish Krona', 'NOK': 'Norwegian Krone',
    'DKK': 'Danish Krone', 'PLN': 'Polish Złoty',
};

function currencyFlagImg(curr) {
    const code = CURRENCY_COUNTRY_CODE[curr];
    if (!code) return '<span style="font-size:1.4rem;">🏳</span>';
    return `<img src="https://flagcdn.com/w40/${code}.png"
                 style="width:36px;height:24px;object-fit:cover;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.15);"
                 onerror="this.style.display='none'">`;
}

async function showCurrencyPanel(targetEl, usdTotal, origin, dest) {
    if (!usdTotal || usdTotal <= 0) return;


    function lookupCurrency(country) {
        if (!country) return null;
        const direct = COUNTRY_CURRENCY[country];
        if (direct) return direct;
        const lower = country.trim().toLowerCase();
        const key = Object.keys(COUNTRY_CURRENCY).find(k => k.toLowerCase() === lower);
        return key ? COUNTRY_CURRENCY[key] : null;
    }

    const originCurr = lookupCurrency(origin);
    const destCurr = lookupCurrency(dest);


    const toFetch = [...new Set([originCurr, destCurr].filter(c => c && c !== 'USD'))];


    const panel = document.createElement('div');
    panel.className = 'currency-panel';
    panel.innerHTML = `
        <div class="currency-panel-title">💱 Shipment Value — Live Currency Conversion</div>
        ${buildPill('usd', 'us', 'USD', 'US Dollar', fmt(usdTotal, 'USD'), 'USD Reference')}
        ${buildPill('origin', CURRENCY_COUNTRY_CODE[originCurr] || '', originCurr || '—', originCurr ? (CURRENCY_NAME[originCurr] || originCurr) : 'Unknown', '<span class="currency-loading"></span>', escHtml(origin) + ' (Export)')}
        ${buildPill('dest', CURRENCY_COUNTRY_CODE[destCurr] || '', destCurr || '—', destCurr ? (CURRENCY_NAME[destCurr] || destCurr) : 'Unknown', '<span class="currency-loading"></span>', escHtml(dest) + ' (Import)')}`;
    targetEl.appendChild(panel);

    if (!toFetch.length) {

        panel.querySelectorAll('.currency-loading').forEach(el => el.outerHTML = fmt(usdTotal, 'USD'));
        return;
    }

    try {
        const url = `https://api.frankfurter.app/latest?from=USD&to=${toFetch.join(',')}`;
        const json = await (await fetch(url)).json();
        const rates = json.rates || {};


        const originEl = panel.querySelector('.currency-pill.origin .currency-pill-amount');
        const destEl = panel.querySelector('.currency-pill.dest   .currency-pill-amount');

        function fillPill(el, curr) {
            if (!el) return;
            if (!curr) { el.innerHTML = '—'; return; }
            if (curr === 'USD') { el.innerHTML = fmt(usdTotal, 'USD'); return; }
            const rate = rates[curr];
            el.innerHTML = rate ? fmt(usdTotal * rate, curr) : '<span style="color:#aaa;font-size:0.85rem;">Rate unavailable</span>';
        }

        fillPill(originEl, originCurr);
        fillPill(destEl, destCurr);

    } catch {
        panel.querySelectorAll('.currency-loading').forEach(el => {
            el.textContent = 'Unavailable';
            el.style.cssText = 'font-size:0.8rem;color:#aaa;';
        });
    }
}

function buildPill(cls, countryCode, currCode, currName, amountHtml, label) {
    const flagHtml = countryCode
        ? `<img src="https://flagcdn.com/w40/${countryCode}.png"
                style="width:36px;height:24px;object-fit:cover;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.15);"
                onerror="this.style.display='none'">`
        : '<span style="font-size:1.2rem;opacity:0.4;">🏳</span>';
    return `<div class="currency-pill ${cls}">
        <div class="currency-pill-flag">${flagHtml}</div>
        <div class="currency-pill-code">${currCode}</div>
        <div class="currency-pill-amount">${amountHtml}</div>
        <div class="currency-pill-label">${escHtml(label)}</div>
    </div>`;
}

function fmt(amount, currency) {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency,
            minimumFractionDigits: 0, maximumFractionDigits: 2
        }).format(amount);
    } catch {
        return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
}
