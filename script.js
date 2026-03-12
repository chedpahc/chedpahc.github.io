// ------------------------ Global Variables ------------------------ //
let uiData, worksData;
let animationTimeouts = [];
let isAnimating = false;
let wasAll = true;
let savedScrollY = 0;
let savedScrollYinDetail = 0;

document.addEventListener("DOMContentLoaded", async() => {
    // ------------------------ Language detection ------------------------ //
    const userLang = navigator.language || navigator.languages[0]; 
    let langCode = localStorage.getItem("lang") || (userLang.startsWith("ko") ? "ko" : "en");

    // Build file paths based on language
    const infoTextData = { file: `/lang/infotext.txt`, classes: "infotext"};
    const cvTextData = { file: `/lang/cvtext_${langCode}.txt`, classes: "cvtext"};

    // Get target elements
    const infoTextContainer = document.querySelector(".infotext");
    const cvTextContainer = document.querySelector(".cvtext");
    
    // Load and update cvtext using the async createTextContent function
    if (cvTextContainer) {
        const cvContentElem = await createTextContent(cvTextData, true);
        cvTextContainer.innerHTML = cvContentElem.innerHTML;
    }

    // Load and update infotext similarly
    if (infoTextContainer) {
        const infoContentElem = await createTextContent(infoTextData);
        infoTextContainer.innerHTML = infoContentElem.innerHTML;
    }

    // load ui data from json
    try {
        const uiResponse = await fetch(window.location.origin + `/lang/ui_${langCode}.json`);
        uiData = await uiResponse.json();
        //console.log("UI Data loaded:", uiData);
    } catch (error) {
        console.error("Error loading UI JSON file:", error);
    }

    // load works data from json
    try {
        const worksResponse = await fetch(window.location.origin + `/lang/works_${langCode}.json`);
        worksData = await worksResponse.json();
        //console.log("Works Data loaded:", worksData);
    } catch (error) {
        console.error("Error loading Works JSON file:", error);
    }

    // update data-i18n contents
    function updateDOMLanguage() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (uiData.translations && uiData.translations[key]) {
            const htmlContent = uiData.translations[key].replace(/\n/g, "<br>");
            el.innerHTML = htmlContent;
        }
        });
    }
    updateDOMLanguage();

    // ------------------------ Language toggle ------------------------ //
    const langToggleButton = document.querySelector("#lang-toggle");
    if (langToggleButton) {
        langToggleButton.innerHTML = `<span class="pressable-text">${langCode === "ko" ? "한국어" : "Eng"}</span>`;
        langToggleButton.addEventListener("click", () => {
        // 현재 언어가 ko면 en, 아니면 ko로 변경
        const newLang = langCode === "ko" ? "en" : "ko";
        localStorage.setItem("lang", newLang);
        location.reload();
        });
    }

    // ------------------------ Theme detection, cycle ------------------------ //
    const themes = ["zero", "one"]; // removed "dark" on 2026 //
    const storedTheme = localStorage.getItem("theme");

    /*const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;*/
    let initialTheme = themes.includes(storedTheme) ? storedTheme : "one";
    let currentThemeIndex = themes.indexOf(initialTheme);

    // setting theme in css
    function setTheme(theme) {
        document.documentElement.className = `${theme}-mode`;
        localStorage.setItem("theme", theme);
        updateLogoSlope(theme);
    }

    // logo slope value per theme
    function updateLogoSlope(theme) {
        const feFuncAList = document.querySelectorAll('#deboss feFuncA');
        if (feFuncAList.length < 2) return;
        switch (theme) {
        case "zero":
            feFuncAList[0].setAttribute('slope', "0");
            feFuncAList[1].setAttribute('slope', "0");
            break;
        case "one":
            feFuncAList[0].setAttribute('slope', "0");
            feFuncAList[1].setAttribute('slope', "0");
            break;
        case "dark": // "gray"
            feFuncAList[0].setAttribute('slope', "1.0");
            feFuncAList[1].setAttribute('slope', "0.15");
            break;
        default:
            console.warn("unknown theme", theme);
        }
    }
    setTheme(initialTheme);

    // ------------------------ Theme cycle button ------------------------ //
    const themeCycleButton = document.querySelector("#theme-cycle");
    function updateToggleButton(theme) {
        if (themeCycleButton) {
        let text;
        switch (theme) {
            case "one":
            text = "1.0";
            break;
            case "dark":
            text = "0.56";
            break;
            case "zero":
            text = "0.0";
            break;
            default:
            text = theme;
        }
        themeCycleButton.innerHTML = `<span class="pressable-text">${text}</span>`;
        }
    }
    if (themeCycleButton) {
        updateToggleButton(themes[currentThemeIndex]);
        themeCycleButton.addEventListener("click", () => {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            const newTheme = themes[currentThemeIndex];
            setTheme(newTheme);
            updateToggleButton(newTheme);
            location.reload();
        });
    }

    // ------------------------ Local storage reset button ------------------------ //
    document.querySelector("#reset").addEventListener("click", () => {
        localStorage.clear(); 
        location.reload();  // 페이지 새로고침해서 다시 언어 감지
    });

    // ------------------------ Caching ------------------------ //
    const header = document.getElementById("site-header");
    const backTo = document.getElementById("back-to");
    //const backToText = document.getElementById("back-to-text");
    const filterButtons = document.querySelectorAll(".tag-button");
    const textcontent = document.querySelector(".tag-text");
    const worksItem = document.querySelectorAll(".works-item");
    const gridfreexContainer = document.querySelector(".gridfreex-container"); // it's not gridfreex-wrapper nor gridfreex itself.. stupid but works

    // ------------------------ Initializing #home page ------------------------ //
    const pages = document.querySelectorAll(".page");
    pages.forEach(page => {
        page.classList.remove("active");
        page.style.display = "none";
    });
    const homePage = document.getElementById("home");
    homePage.classList.add("active");
    homePage.style.display = "flex";
    homePage.style.opacity = "1";
    
    // initialize tag-text
    const selectedTags = new Set();
    filterWorks();

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> NAVIGATION <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
    // ------------------------ Showpage & Crossfade ------------------------ //
    function showPage(target) {
        if (isAnimating) return;  // escape if already animating
        isAnimating = true;  // start animation
        // from and to page
        const fromPage = document.querySelector(".page.active");
        const toPage = document.getElementById(target);
        if (!toPage || fromPage === toPage) {
            isAnimating = false;
            return;
        }
        updateHeaderVisibility(toPage);
        // crossfade exception when loading #works-detail
        if (target === "works-detail") {
            fromPage.classList.remove("active");
            fromPage.style.display = "none";
            toPage.classList.add("active");
            toPage.style.display = "flex";
            toPage.style.position = "relative"; //this affects header : sticky somehow
            toPage.style.opacity = "1";
            isAnimating = false;
            return;
        }
        // start crossfade
        fromPage.style.opacity = "0"; // frompage transition start 
        toPage.style.opacity = "0";
        toPage.style.display = "flex";
        requestAnimationFrame(() => {
            void toPage.offsetWidth;
            toPage.style.opacity = "1";  // toPage transition start
        });
        // after crossfade
        setTimeout(() => {
            fromPage.classList.remove("active");
            fromPage.style.display = "none";  // hide fromPage
            toPage.classList.add("active");
            //updateHeaderVisibility(toPage);
            isAnimating = false; 
        }, 350); //css transition time
    }

    // ------------------------ Dynamic header behaviour ------------------------ //

    function updateMaskStops(page) {
        const headerTextWrapper = document.querySelector('.header-text-wrapper');
        if (!headerTextWrapper) return;
        
        const rootStyles = getComputedStyle(document.documentElement);
        let varVW;
        
        if (page && page.id === "works-detail") {
          // Use alternative variables for works-detail page
          varVW = parseFloat(rootStyles.getPropertyValue('--gridfreex-wrapper-vw'));
          //console.log(varVW);
        } else {
          varVW = parseFloat(rootStyles.getPropertyValue('--base-vw'));
          //console.log(varVW);
        }
        
        // Calculate extra space and corresponding mask stops:
        const extra = 100 - varVW;
        const leftGap = extra / 2;
        const leftStop = (leftGap / 100) * 100 + 1;
        const rightStop = 100 - leftStop;
        
        headerTextWrapper.style.setProperty('--mask-stop-left', `${leftStop}%`);
        headerTextWrapper.style.setProperty('--mask-stop-right', `${rightStop}%`);
        //console.log(leftStop, rightStop);
    }
      
      
    function updateHeaderVisibility(page) {
        if (page && (page.id === "works" || page.id === "works-detail")) {
            header.classList.remove("hidden");
            requestAnimationFrame(() => updateMaskStops(page));
        } else {
            header.classList.add("hidden");
        }
    }

    // ------------------------ Calculating scroll offset in #works-search page ------------------------ //
    function backToWorksScrollOffset() {
        savedScrollYinDetail = window.pageYOffset; // scroll value inside detail page
        gridfreexContainer.style.marginTop = (savedScrollY - savedScrollYinDetail) + "px"; //set final offset

        window.scrollTo(0, savedScrollY); // revert scroll position from previous #works page
        gridfreexContainer.classList.remove("visible");
    
        setTimeout(() => {
            gridfreexContainer.style.marginTop = "0px"; // remove margin after transition
        }, 400); //css transition time
    }

    // ------------------------ back-to buttons ------------------------ //
    backTo.addEventListener("click", (e) => {
        e.preventDefault();
        const activePage = document.querySelector(".page.active");
        if (activePage?.id === "works-detail") {
            history.pushState({}, "", "/works");
            showPage("works");
            //reset
            backToWorksScrollOffset();
            stopMedia()
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
            history.pushState({}, "", "/");
            showPage("home");
        }
    });
      

    // ------------------------ "about" + "works" navigation ------------------------ //
    // #about page open/close handlers
    document.querySelectorAll("#go-to-about, #close-links").forEach((el) => {
        el.addEventListener("click", () => {
            if (document.getElementById("about").classList.contains("active")) return;
            history.pushState({}, "", "/about");
            showPage("about");
        });
    });
    
    document.getElementById("go-to-home").addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
        history.pushState({}, "", "/");
        showPage("home");
        //reset
        mailText?.classList.remove("highlight");
    });

    // #grid2x-items external links
    document.querySelectorAll(".external-link").forEach(item => {
    item.addEventListener("click", event => {
        const link = item.getAttribute("data-link");
        window.open(link, "_blank");
        });
    });

    // on clicking "links"
    document.getElementById("go-to-links").addEventListener("click", () => {
        history.pushState({}, "", "/links");
        showPage("links");
    });

    // on clicking "works"
    document.getElementById("go-to-works").addEventListener("click", () => {
        history.pushState({}, "", "/works");
        showPage("works");
    });

    
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> FILTERING WORKS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
    // ------------------------ Dynamic Tag text size ------------------------ //
    function adjustTagTextFontSize() {
        const container = document.querySelector(".tag-area-text");
        if (!container || !textcontent) return;
        
        let currentFontSize = window.innerWidth <= 768 ? 32 : 45;
        textcontent.style.fontSize = currentFontSize + "px";
        
        // Decrease font size until text fits within its container
        while (textcontent.scrollWidth > textcontent.clientWidth && currentFontSize > 10) {
          currentFontSize--;
          textcontent.style.fontSize = currentFontSize + "px";
        }
    }

    // ------------------------ Dynamic Tag text content ------------------------ //
    function updateTagText(newText) {
        if (!textcontent) return;
        textcontent.classList.add("fade-out"); // 기존 텍스트가 fade-out을 시작하는 애니메이션

        setTimeout(() => {
            textcontent.classList.remove("fade-out"); // 기존 텍스트는 fade-out 상태에서 제거
            textcontent.textContent = newText; // 텍스트를 새로 업데이트
            textcontent.classList.add("fade-in"); // 새 텍스트에 fade-in 애니메이션 적용

            setTimeout(() => {
                textcontent.classList.remove("fade-in"); // fade-in 완료 후, "fade-in" 클래스를 제거하여 다시 상태 초기화
            }, 150);  //  fade-out 애니메이션 시간
        }, 150);
    }

    function clearAnimations() {
        // 예약된 모든 timeout을 취소
        animationTimeouts.forEach(timeout => clearTimeout(timeout));
        animationTimeouts = [];
    }

    // ------------------------ Filtering logic ------------------------ //
    function filterWorks() {
        // tagMappings를 사용해 selectedTags에 들어있는 내부 키를 번역 키로 변환한 후, 번역된 텍스트를 가져옴
        let tagString = Array.from(selectedTags)
        .map(tag => {
            const translationKey = (uiData.tagMappings && uiData.tagMappings[tag]) || tag;
            let translatedTag = uiData.translations[translationKey] || (tag.charAt(0).toUpperCase() + tag.slice(1)); // first letter capital

            // "co-work" 처리: "co-work" → "co"
            if (translatedTag.toLowerCase().includes("co-work")) {
                translatedTag = translatedTag.replace(/work/i, ""); // "work" 제거
            }
            
            return translatedTag;
        })
        .join(", ");

        // 아무 태그도 선택되지 않은 경우 "전체" (또는 해당 언어에 맞는 tag-all 값)로 설정
        if (selectedTags.size === 0) {
            tagString = uiData.translations["tag1"];
        }

        setTimeout(() => {
            textcontent.textContent = `${tagString} ${uiData.translations["works"]}`;
            adjustTagTextFontSize();
        }, 100)

        updateTagText(`${tagString} ${uiData.translations["works"]}`);
        clearAnimations(); // clear animation

        const isNowAll = (tagString === "All");
        if (!isNowAll && wasAll) {
            worksItem.forEach(work => work.classList.remove("visible")); // All 상태에서 처음 벗어날 때 실행할 코드
        }
        wasAll = isNowAll; // 현재 상태를 업데이트

        const visibleWorks = [];
        worksItem.forEach((work) => {
            const workTags = new Set(work.dataset.tags.split(" "));
            const isVisible = (
                selectedTags.size === 0 ||
                [...selectedTags].every(tag => workTags.has(tag))
            );
            if (isVisible) {
                visibleWorks.push(work); // no stagger animation for works-item if it was previously visible
            } else {
                work.classList.remove("visible"); // remove visible.classlist for stagger animation
            }
        });
        // stagger effect (delay each item)
        visibleWorks.forEach((work, index) => {
            const timeoutId = setTimeout(() => {
                work.classList.add("visible");
            }, index * 75); 
            animationTimeouts.push(timeoutId);
        });
    }
    function updateAllButton() {
        document.querySelector(".tag-button[data-tag='all']").classList.toggle("active", selectedTags.size === 0);
    }

    /// ------------------------ Tag buttons toggle behaviour ------------------------ //
    const ROLE_RADIO = ["solo", "team", "commission"];

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            const filterTag = button.dataset.tag;

            // If all, clear tags 
            if (filterTag === "all") {
                selectedTags.clear();
                filterButtons.forEach(btn => btn.classList.remove("active"));
                updateAllButton();
                filterWorks();
                return;
            }
        
            // If "older" is clicked, toggle it and remove other year tags if needed
            if (filterTag === "older") {
                if (selectedTags.has("older")) {
                selectedTags.delete("older");
                button.classList.remove("active");
                } else {
                filterButtons.forEach(btn => {
                    if (btn.classList.contains("year") && btn.dataset.tag !== "older") {
                    selectedTags.delete(btn.dataset.tag);
                    btn.classList.remove("active");
                    }
                });
                selectedTags.add("older");
                button.classList.add("active");
                }
                updateAllButton();
                filterWorks();
                return;
            }
        
            // year tag behaviour (selective radio)
            /*
            if (button.classList.contains("year") && filterTag !== "older" && selectedTags.has("older")) {
                selectedTags.delete("older");
                document.querySelector(".tag-button[data-tag='older']").classList.remove("active");
            }*/
            // year tag behaviour (radio)
            if (button.classList.contains("year")) {

                // older 제거
                if (selectedTags.has("older")) {
                    selectedTags.delete("older");
                    document.querySelector(".tag-button[data-tag='older']").classList.remove("active");
                }

                // 기존 year 전부 해제
                filterButtons.forEach(btn => {
                    if (btn.classList.contains("year")) {
                        selectedTags.delete(btn.dataset.tag);
                        btn.classList.remove("active");
                    }
                });

                // 클릭한 year만 선택
                selectedTags.add(filterTag);
                button.classList.add("active");

                updateAllButton();
                filterWorks();
                return;
            }

            // role radio (solo / team / commission) - mutual exclusive + toggle
            if (ROLE_RADIO.includes(filterTag)) {

                if (selectedTags.has(filterTag)) {
                    // 다시 누르면 해제
                    selectedTags.delete(filterTag);
                    button.classList.remove("active");

                } else {
                    // 다른 role 전부 해제
                    ROLE_RADIO.forEach(tag => {
                        selectedTags.delete(tag);
                        const btn = document.querySelector(`.tag-button[data-tag='${tag}']`);
                        if (btn) btn.classList.remove("active");
                    });

                    // 클릭한 role 선택
                    selectedTags.add(filterTag);
                    button.classList.add("active");
                }

                updateAllButton();
                filterWorks();
                return;
            }
            
            // Normal toggle logic for other tags
            if (selectedTags.has(filterTag)) {
            selectedTags.delete(filterTag);
            button.classList.remove("active");
            } else {
            selectedTags.add(filterTag);
            button.classList.add("active");
            }
            updateAllButton();
            filterWorks();
        });
    });

    // ------------------------ Expand / Collapse button ------------------------ //
    document.querySelector(".expand-collapse-button").addEventListener('click', function() {
        const searchgrid3x = document.querySelector(".search");
        const expandContainer = document.querySelector(".expand-container");

        expandContainer.style.setProperty("--expanded-height", `${expandContainer.scrollHeight}px`); // calculate container height and declare css var

        searchgrid3x.classList.toggle("expanded");
        // 'more-tags'와 'year-tags'에 대해 각각 숨기기/보이기 처리
        if (expandContainer.classList.contains("expanded")) {
            expandContainer.classList.remove("expanded");
            this.textContent = '+';  // 버튼 텍스트 변경
        } else {
            expandContainer.classList.add("expanded");
            this.textContent = '−';  // 버튼 텍스트 변경
        }
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Works detail <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
    function stopMedia() {
        waveInstances.forEach(instance => {
            if (instance && instance.isPlaying()) {
                instance.pause();
            }
            //instance.destroy();
        });
        // Optionally clear the array:
        waveInstances.length = 0;
        const videos = document.querySelectorAll("video");
        videos.forEach(video => {
            if (!video.paused) {
                video.pause();  // 비디오 멈추기
            }
            // video.currentTime = 0; // 필요 시 비디오를 처음으로 되돌리기 (선택사항)
        });
    }

    // ------------------------ Load work content and form gridfreex layout from json data ------------------------ //
    async function loadWorkDetail(workId) {

        //console.log("loadWorkDetail executed, checking visibility");
        const worksDetailSection = document.querySelector(".page.active");
        //console.log("works-detail display:", getComputedStyle(worksDetailSection).opacity);

        savedScrollY = window.pageYOffset; // save scroll point before loading detail

        const work = worksData[workId];
        //console.log("const work =", work)
        if (!work) return;

        const container = document.getElementById("gridfreex");
        //console.log("container", container)
        container.innerHTML = ""; // Clear existing content

        const rowCount = work.layout.length;
        const colCount = work.layout[0].length;

        // grid-template-columns 속성을 동적으로 colCount에 맞춰 업데이트
        container.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;

        const visited = Array.from({ length: rowCount }, () => Array(colCount).fill(false));

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            for (let colIndex = 0; colIndex < colCount; colIndex++) {
                const item = work.layout[rowIndex][colIndex];
                if (visited[rowIndex][colIndex]) continue;

                // Create the grid cell element
                const cell = document.createElement("div");
                cell.classList.add("gridfreex-cell");

                // Calculate span sizes
                const { colSpan, rowSpan } = calculateSpanSizes(work.layout, rowIndex, colIndex, colCount, rowCount, item);
                if (colSpan > 1) cell.style.gridColumn = `span ${colSpan}`;
                if (rowSpan > 1) cell.style.gridRow = `span ${rowSpan}`;

                markVisited(visited, rowIndex, colIndex, rowSpan, colSpan);

                // Create the cell content based on its type
                const content = work.content[item];
                if (content) {
                    cell.classList.add(item);
                    let contentElem = await createContentElement(item, content); // ✅ Await it here
                    if (contentElem) {
                        cell.appendChild(contentElem);
                    }
                }
                container.appendChild(cell);
            }
        }

        window.scrollTo(0, 0);
    }

    // Helper function to calculate span sizes
    function calculateSpanSizes(layout, rowIndex, colIndex, colCount, rowCount, item) {
        let colSpan = 1, rowSpan = 1;
        while (colIndex + colSpan < colCount && layout[rowIndex][colIndex + colSpan] === item) colSpan++;
        while (rowIndex + rowSpan < rowCount && layout[rowIndex + rowSpan][colIndex] === item) rowSpan++;
        return { colSpan, rowSpan };
        }

        // Helper function to mark visited cells in the 2D visited array
        function markVisited(visited, rowIndex, colIndex, rowSpan, colSpan) {
        for (let r = 0; r < rowSpan; r++) {
            for (let c = 0; c < colSpan; c++) {
            visited[rowIndex + r][colIndex + c] = true;
            }
        }
    }

    // Helper function to create content element based on the type prefix
        function createContentElement(item, content) {
        if (item.startsWith("txt-")) {
            return createTextContent(content);
        } else if (item.startsWith("aud-")) {
            return createAudioContent(item, content);
        } else if (item.startsWith("img-")) {
            return createImageContent(content);
        } else if (item.startsWith("vid-")) {
            return createVideoContent(content);
        }
        return null;
        }

    // ------------------------ Text (line range 지원 포함) ------------------------ //
    async function createTextContent(content, iscvTextData = false) {
        function parseLineRange(rangeStr, totalLines) {
            if (rangeStr === undefined || rangeStr === null) return [0, totalLines - 1];
            const s = String(rangeStr).trim();
            if (!s || s === "all") return [0, totalLines - 1];
            if (/^\d+$/.test(s)) {
                const idx = parseInt(s, 10);
                return [Math.max(0, idx), Math.min(totalLines - 1, idx)];
            }
            const m = s.match(/^(\d*)-(\d*)$/);
            if (!m) return [0, totalLines - 1];
            const start = m[1] === "" ? 0 : parseInt(m[1], 10);
            const end = m[2] === "" ? totalLines - 1 : parseInt(m[2], 10);
            return [Math.max(0, start), Math.min(totalLines - 1, end)];
        }

        let rawText = "";

        if (typeof content === "object" && content.file) {
            try {
            const response = await fetch(content.file, { mode: 'cors' });
            console.log('fetch', response.status, response.headers.get('content-type'));
            if (!response.ok) throw new Error('Failed to fetch text file: ' + response.status);
            rawText = await response.text();
            } catch (error) {
            console.error("Error loading TXT file:", error);
            rawText = "Error loading content";
            }
        } else if (typeof content === "object") {
            rawText = content.text || "";
        } else {
            rawText = content || "";
        }

        // Normalize newlines
        rawText = rawText.replace(/\uFEFF/g, "").replace(/\r\n?/g, "\n");

        // If content.line specified, slice lines before further processing
        if (typeof content === "object" && content.line !== undefined) {
            const lines = rawText.split(/\n/);
            const [start, end] = parseLineRange(content.line, lines.length);
            // if start > end => empty
            rawText = start <= end ? lines.slice(start, end + 1).join("\n") : "";
        }

        // Hyperlink formatting (Markdown-style links) on raw text
        rawText = rawText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, p1, p2) => {
            return `<a href="${p2}" target="_blank">${p1}</a>`;
        });

        // CV formatting
        if (iscvTextData) {
            let isFirstTitle = true;
            rawText = rawText.replace(/\[([^\]]+)\]/g, (match, p1) => {
            if (isFirstTitle) {
                isFirstTitle = false;
                return `<span class="cvtitlebig">${p1}</span>`;
            } else {
                return `<span class="cvtitle">${p1}</span>`;
            }
            });
            rawText = rawText.replace(/--([^<]+)--/g, (match, p1) => `<span id="mailtext">${p1}</span>`);
        }

        // Convert newlines to <br>
        let textContent = rawText.replace(/\n/g, "<br>");

        const elem = document.createElement("div");
        if (typeof content === "object" && content.classes) {
            content.classes.split(" ").forEach(cls => {
            if (cls.trim()) elem.classList.add(cls.trim());
            });
        }
        elem.classList.add("break-words");
        elem.innerHTML = textContent;

        // open in current tab if user clicks from CVtext
        if (elem.classList.contains("cvtext")) {
            elem.querySelectorAll("a").forEach(a => a.removeAttribute("target"));
        }

        return elem;
    }
    // ------------------------ Audio (loading indicator 포함) ------------------------ //
        const waveInstances = [];
        const waveColor = getComputedStyle(document.documentElement).getPropertyValue('--color-item-active').trim();
        const progressColor = getComputedStyle(document.documentElement).getPropertyValue('--color-waveprogress').trim();

        function createAudioContent(item, content) {
            const audioWrapper = document.createElement("div");
            audioWrapper.classList.add("audio-wrapper");

            const waveContainer = document.createElement("div");
            waveContainer.classList.add("waveform");
            waveContainer.id = `waveform-${item}`;

            // 로딩 오버레이
            const loadingOverlay = document.createElement("div");
            loadingOverlay.className = "loading-overlay";

            const spinner = document.createElement("div");
            spinner.className = "loading-spinner";

            loadingOverlay.appendChild(spinner);

            const waveformFixed = document.createElement("div");
            waveformFixed.classList.add("waveform-fixed");
            waveformFixed.appendChild(waveContainer);

            audioWrapper.appendChild(waveformFixed);
            audioWrapper.appendChild(loadingOverlay);

            const WAVE_HEIGHT = 128;

            const waveSurfer = WaveSurfer.create({
                container: waveContainer,
                waveColor: waveColor,
                progressColor: progressColor,
                barWidth: 3,
                cursorColor: progressColor,
                cursorWidth: 1,
                responsive: true,
                backend: 'WebAudio',
                normalize: true,
                height: WAVE_HEIGHT,
            });

            const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
            let vol = 1;
            let currentHeight = WAVE_HEIGHT;
            let targetHeight = WAVE_HEIGHT;
            const MIN_H = 7;
            const MAX_H = WAVE_HEIGHT;
            let animating = false;

            function animateHeight() {
                const diff = targetHeight - currentHeight;
                if (Math.abs(diff) < 0.5) {
                    currentHeight = targetHeight;
                    animating = false;
                    return;
                }
                currentHeight += diff * 0.25;
                waveSurfer.setOptions({ height: Math.round(currentHeight) });
                requestAnimationFrame(animateHeight);
            }

            if (!isTouchDevice) {
                audioWrapper.addEventListener('wheel', (ev) => {
                    ev.preventDefault();
                    vol = Math.min(1, Math.max(0, vol + (ev.deltaY < 0 ? 0.05 : -0.05)));
                    if (waveSurfer.media) waveSurfer.media.volume = vol;
                    targetHeight = MIN_H + vol * (MAX_H - MIN_H);
                    if (!animating) {
                        animating = true;
                        requestAnimationFrame(animateHeight);
                    }

                    const opacity = 0.5 + vol * 0.5;
                    waveContainer.style.opacity = opacity;
                }, { passive: false });
            }
            
            // 로딩 표시
            waveSurfer.on('loading', () => {
                loadingOverlay.classList.remove('hidden');
            });

            // 로딩 완료
            waveSurfer.on('ready', () => {
                loadingOverlay.classList.add('hidden');
            });

            // 에러 시에도 숨김
            waveSurfer.on('error', (err) => {
                console.error('WaveSurfer load error', err);
                loadingOverlay.classList.add('hidden');
            });

            // 로드 시작
            waveSurfer.load(content.src);
            waveInstances.push(waveSurfer);

            // 파형 클릭 재생
            waveContainer.addEventListener("click", () => {
                if (waveSurfer.isPlaying()) waveSurfer.pause();
                else waveSurfer.play();
            });

            if (content.caption) {
                const caption = document.createElement("figcaption");
                caption.textContent = content.caption;
                audioWrapper.appendChild(caption);
            }
            return audioWrapper;
        }


    // ------------------------ Image ------------------------ //
    function createImageContent(content) {
        const imageWrapper = document.createElement("div");
        imageWrapper.classList.add("image-wrapper");
    
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        let src, caption, scale;
    
        if (typeof content === "object") {
            src = content.src;
            caption = content.caption;
            scale = content.scale;
        } else {
            src = content;
        }
    
        img.src = src;
    
        // 확장자 추출 (소문자로 변환해서 비교)
        const isPNG = src.toLowerCase().endsWith(".png");
    
        if (scale) {
            imageWrapper.style.width = scale + "%";
        }
    
        if (isPNG) {
            // PNG인 경우: img를 직접 figure에 넣음
            figure.appendChild(img);
            if (caption) {
                const figcaption = document.createElement("figcaption");
                figcaption.textContent = caption;
                figure.appendChild(figcaption);
            }
        } else {
            // PNG가 아닌 경우: imgContainer 사용
            const imgContainer = document.createElement("div");
            imgContainer.classList.add("img-container");
            imgContainer.style.position = "relative";
            imgContainer.appendChild(img);
    
            figure.appendChild(imgContainer);
            if (caption) {
                const figcaption = document.createElement("figcaption");
                figcaption.textContent = caption;
                figure.appendChild(figcaption);
            }
        }
    
        imageWrapper.appendChild(figure);
        return imageWrapper;
    }
    

    // ------------------------ Video ------------------------ //
    function createVideoContent(content) {
        // Create video wrapper
        const videoWrapper = document.createElement("div");
        videoWrapper.classList.add("video-wrapper");
      
        // Create video container (for relative positioning)
        const videoContainer = document.createElement("div");
        videoContainer.classList.add("video-container");

        // content에 scale 값이 있다면 width를 해당 값으로 지정 (예: 50 => 50%)
        if (content.scale) {
            videoContainer.style.maxWidth = content.scale + "%";
        }
        
        // Create video element
        const videoElem = document.createElement("video");
        videoElem.controls = false; // Remove native controls
        videoElem.setAttribute("preload", "none");
        videoElem.volume = 0.4; // Default volume 50%
        videoElem.loop = false;
      
        // Append video source
        const sourceElem = document.createElement("source");
        sourceElem.src = content.src;
        sourceElem.type = "video/mp4";
        videoElem.appendChild(sourceElem);
      
        // Set poster if provided
        if (content.poster) {
          videoElem.setAttribute("poster", content.poster);
        }
      
        // Set aspect ratio (default 16/9)
        const ratio = content.aspectRatio || "16/9";
        videoContainer.style.aspectRatio = ratio.replace("/", " / ");
      
        // Append video element to container
        videoContainer.appendChild(videoElem);
      
        // Create controls container
        const controlsDiv = document.createElement("div");
        controlsDiv.classList.add("controls-div");
      
        // --- Sound Button ---
        const soundButton = document.createElement("div");
        soundButton.classList.add("sound-button");
      
        // Sound icon element (default unmuted icon)
        const soundIcon = document.createElement("span");
        soundIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.73058 14.5859C5.52237 14.6289 5.40093 14.3523 5.5648 14.2169C7.50722 12.6113 7.50722 11.3887 5.5648 9.78312C5.40093 9.64767 5.52228 9.37222 5.73028 9.41624C9.12034 10.1336 10.6085 11.2368 10.6085 12C10.6085 12.768 9.40991 13.826 5.73058 14.5859Z" fill="white"/>
            <path d="M11.0394 17.3415C10.8764 17.4042 10.7195 17.239 10.7826 17.0762C11.9852 13.9735 11.9852 10.0265 10.7826 6.92377C10.7195 6.76097 10.8766 6.59616 11.0393 6.65976C14.6827 8.08497 15.6301 10.4109 15.6301 12C15.6301 13.594 15.0087 15.8127 11.0394 17.3415Z" fill="white"/>
            <path d="M16.7859 1.42902C16.6493 1.29251 16.4184 1.41138 16.4504 1.60183C17.7479 9.32229 17.7479 14.6777 16.4504 22.3982C16.4184 22.5886 16.6482 22.7086 16.7848 22.572C23.4167 15.9424 24.0525 8.69168 16.7859 1.42902Z" fill="white"/>
            <path d="M4.8695 12C4.8695 12.7594 4.22714 13.375 3.43475 13.375C2.64236 13.375 2 12.7594 2 12C2 11.2406 2.64236 10.625 3.43475 10.625C4.22714 10.625 4.8695 11.2406 4.8695 12Z" fill="white"/>
            </svg>
        `;
        soundButton.appendChild(soundIcon);
      
        // Volume slider
        const volumeSlider = document.createElement("div");
        volumeSlider.classList.add("volume-slider");
        const volumeFill = document.createElement("div");
        volumeFill.classList.add("volume-fill");
        volumeSlider.appendChild(volumeFill);
        soundButton.appendChild(volumeSlider);
      
        let isDraggingVolume = false;
      
        // Show volume slider on mouse enter
        soundButton.addEventListener("pointermove", () => {
          volumeSlider.style.display = "block";
        });
      
        // Hide slider and restore icon on mouse leave
        soundButton.addEventListener("pointerleave", () => {
          setTimeout(() => {
            if (!isDraggingVolume) {
              volumeSlider.style.display = "none";
              // Restore icon based on mute state
              
              soundIcon.innerHTML =
                videoElem.volume === 0
                  ? `
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.73058 14.5859C5.52237 14.6289 5.40093 14.3523 5.5648 14.2169C7.50722 12.6113 7.50722 11.3887 5.5648 9.78312C5.40093 9.64767 5.52228 9.37222 5.73028 9.41624C9.12034 10.1336 10.6085 11.2368 10.6085 12C10.6085 12.768 9.40991 13.826 5.73058 14.5859Z" fill="white"/>
                    <path d="M11.0394 17.3415C10.8764 17.4042 10.7195 17.239 10.7826 17.0762C11.9852 13.9735 11.9852 10.0265 10.7826 6.92377C10.7195 6.76097 10.8766 6.59616 11.0393 6.65976C14.6827 8.08497 15.6301 10.4109 15.6301 12C15.6301 13.594 15.0087 15.8127 11.0394 17.3415Z" fill="white"/>
                    <path d="M16.7859 1.42902C16.6493 1.29251 16.4184 1.41138 16.4504 1.60183C17.7479 9.32229 17.7479 14.6777 16.4504 22.3982C16.4184 22.5886 16.6482 22.7086 16.7848 22.572C23.4167 15.9424 24.0525 8.69168 16.7859 1.42902Z" fill="white"/>
                    <path d="M4.8695 12C4.8695 12.7594 4.22714 13.375 3.43475 13.375C2.64236 13.375 2 12.7594 2 12C2 11.2406 2.64236 10.625 3.43475 10.625C4.22714 10.625 4.8695 11.2406 4.8695 12Z" fill="white"/>
                    </svg>`
                  : `
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.73058 14.5859C5.52237 14.6289 5.40093 14.3523 5.5648 14.2169C7.50722 12.6113 7.50722 11.3887 5.5648 9.78312C5.40093 9.64767 5.52228 9.37222 5.73028 9.41624C9.12034 10.1336 10.6085 11.2368 10.6085 12C10.6085 12.768 9.40991 13.826 5.73058 14.5859Z" fill="white"/>
                    <path d="M11.0394 17.3415C10.8764 17.4042 10.7195 17.239 10.7826 17.0762C11.9852 13.9735 11.9852 10.0265 10.7826 6.92377C10.7195 6.76097 10.8766 6.59616 11.0393 6.65976C14.6827 8.08497 15.6301 10.4109 15.6301 12C15.6301 13.594 15.0087 15.8127 11.0394 17.3415Z" fill="white"/>
                    <path d="M16.7859 1.42902C16.6493 1.29251 16.4184 1.41138 16.4504 1.60183C17.7479 9.32229 17.7479 14.6777 16.4504 22.3982C16.4184 22.5886 16.6482 22.7086 16.7848 22.572C23.4167 15.9424 24.0525 8.69168 16.7859 1.42902Z" fill="white"/>
                    <path d="M4.8695 12C4.8695 12.7594 4.22714 13.375 3.43475 13.375C2.64236 13.375 2 12.7594 2 12C2 11.2406 2.64236 10.625 3.43475 10.625C4.22714 10.625 4.8695 11.2406 4.8695 12Z" fill="white"/>
                    </svg>`;
            
            }
          }, 750);
        });
      
        // Volume slider drag events
        volumeSlider.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            isDraggingVolume = true;
            updateVolume(e);
            document.addEventListener("mousemove", updateVolume);
            document.addEventListener("mouseup", stopDragging);
        });
      
        function updateVolume(e) {
          const sliderRect = volumeSlider.getBoundingClientRect();
          const offsetY = e.clientY - sliderRect.top;
          let newVolume = 1 - offsetY / sliderRect.height;
          newVolume = Math.min(Math.max(newVolume, 0), 1);
          videoElem.volume = newVolume;
          volumeFill.style.height = newVolume * 100 + "%";
          // Update icon to show volume number (avoiding overflow)
          soundIcon.innerHTML = Math.round(newVolume * 99);
        }
      
        function stopDragging() {
          isDraggingVolume = false;
          document.removeEventListener("mousemove", updateVolume);
          document.removeEventListener("mouseup", stopDragging);
        }
      
        controlsDiv.appendChild(soundButton);
      
        // --- Play/Pause Button ---
        const playPauseButton = document.createElement("div");
        playPauseButton.classList.add("play-pause-button");
        playPauseButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.78793 21.7594C9.04505 16.0567 9.04505 7.94326 5.78793 2.24055C5.67245 2.03836 5.96022 1.78503 6.14075 1.93209C12.5835 7.18046 16.1256 9.76256 20.5921 11.8152C20.7493 11.8874 20.7493 12.1126 20.5921 12.1848C16.1256 14.2374 12.5835 16.8195 6.14075 22.0679C5.96022 22.215 5.67245 21.9616 5.78793 21.7594Z" fill="white"/>
            </svg>
        `;
        controlsDiv.appendChild(playPauseButton);
      
        // --- Fullscreen Button ---
        const fullscreenButton = document.createElement("div");
        fullscreenButton.classList.add("fullscreen-button");
        fullscreenButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M14.9942 3.3803C14.8014 3.31546 14.6578 3.55219 14.7895 3.70719C15.3362 4.35047 15.8256 5.13564 15.8256 5.98346C15.8256 8.16426 14.113 9.93216 12.0004 9.93216C9.88775 9.93216 8.17512 8.16426 8.17512 5.98346C8.17512 5.13048 8.6714 4.23784 9.22231 3.546C9.34901 3.3869 9.19996 3.14596 9.00759 3.212C6.22858 4.16601 3.76793 6.33067 2.72868 8.91675C2.65402 9.10254 2.88582 9.26564 3.05687 9.16155C3.74517 8.7427 4.58755 8.49627 5.49744 8.49627C7.82134 8.49627 9.70522 10.1034 9.70522 12.086C9.70522 14.0685 7.82134 15.6757 5.49744 15.6757C4.58709 15.6757 3.74454 15.4288 3.05616 15.0094C2.88514 14.9052 2.65363 15.0683 2.72881 15.2539C3.76832 17.8199 6.2282 19.8559 9.00677 20.7903C9.19955 20.8551 9.34313 20.6185 9.2114 20.4635C8.6648 19.8205 8.17512 19.036 8.17512 18.1885C8.17512 16.0077 9.88775 14.2398 12.0004 14.2398C14.113 14.2398 15.8256 16.0077 15.8256 18.1885C15.8256 19.0361 15.3359 19.8206 14.7893 20.4636C14.6576 20.6185 14.8011 20.8551 14.9939 20.7903C17.7725 19.856 20.2312 17.8198 21.2705 15.2536C21.3457 15.068 21.1143 14.905 20.9433 15.0092C20.2552 15.4285 19.4134 15.6757 18.5033 15.6757C16.1794 15.6757 14.2955 14.0685 14.2955 12.086C14.2955 10.1034 16.1794 8.49627 18.5033 8.49627C19.4134 8.49627 20.2556 8.74301 20.9439 9.1621C21.1149 9.26624 21.3464 9.10321 21.2712 8.91762C20.2317 6.35147 17.7727 4.31465 14.9942 3.3803Z" fill="white"/>
            <path d="M14.9942 3.3803C14.8014 3.31546 14.6578 3.55219 14.7895 3.70719C15.3362 4.35047 15.8256 5.13564 15.8256 5.98346C15.8256 8.16426 14.113 9.93216 12.0004 9.93216C9.88775 9.93216 8.17512 8.16426 8.17512 5.98346C8.17512 5.13048 8.6714 4.23784 9.22231 3.546C9.34901 3.3869 9.19996 3.14596 9.00759 3.212C6.22858 4.16601 3.76793 6.33067 2.72868 8.91675C2.65402 9.10254 2.88582 9.26564 3.05687 9.16155C3.74517 8.7427 4.58755 8.49627 5.49744 8.49627C7.82134 8.49627 9.70522 10.1034 9.70522 12.086C9.70522 14.0685 7.82134 15.6757 5.49744 15.6757C4.58709 15.6757 3.74454 15.4288 3.05616 15.0094C2.88514 14.9052 2.65363 15.0683 2.72881 15.2539C3.76832 17.8199 6.2282 19.8559 9.00677 20.7903C9.19955 20.8551 9.34313 20.6185 9.2114 20.4635C8.6648 19.8205 8.17512 19.036 8.17512 18.1885C8.17512 16.0077 9.88775 14.2398 12.0004 14.2398C14.113 14.2398 15.8256 16.0077 15.8256 18.1885C15.8256 19.0361 15.3359 19.8206 14.7893 20.4636C14.6576 20.6185 14.8011 20.8551 14.9939 20.7903C17.7725 19.856 20.2312 17.8198 21.2705 15.2536C21.3457 15.068 21.1143 14.905 20.9433 15.0092C20.2552 15.4285 19.4134 15.6757 18.5033 15.6757C16.1794 15.6757 14.2955 14.0685 14.2955 12.086C14.2955 10.1034 16.1794 8.49627 18.5033 8.49627C19.4134 8.49627 20.2556 8.74301 20.9439 9.1621C21.1149 9.26624 21.3464 9.10321 21.2712 8.91762C20.2317 6.35147 17.7727 4.31465 14.9942 3.3803Z" fill="white"/>
            </svg>
        `;
        controlsDiv.appendChild(fullscreenButton);
      
        // Append controls to video container and container to wrapper
        videoContainer.appendChild(controlsDiv);
        videoWrapper.appendChild(videoContainer);

        // Toggle play/pause
        function togglePlayPause() {
            if (videoElem.paused) {
                videoElem.play();
                // When playing, show pause icon
                playPauseButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.5488 22.3247C6.41972 22.4931 6.16036 22.3656 6.20877 22.159C7.66374 15.9503 7.66374 8.04968 6.20877 1.84097C6.16036 1.63438 6.42702 1.50131 6.56311 1.6641C10.9489 6.91048 10.8084 8.58278 11.1452 9.64463C11.1741 9.73602 11.1387 9.83826 11.06 9.89294C7.95045 12.052 10.8867 16.6655 6.5488 22.3247Z" fill="white"/>
                <path d="M18.4421 1.53089C18.5879 1.38515 18.8256 1.53429 18.7655 1.73149C16.8559 7.99303 16.8559 16.007 18.7655 22.2685C18.8256 22.4657 18.5839 22.6193 18.4331 22.4787C12.7447 17.1769 13.4337 15.5423 13.0771 14.4777C13.0418 14.3724 13.0858 14.2496 13.1833 14.1964C17.1791 12.0156 12.7105 7.25907 18.4421 1.53089Z" fill="white"/>
                </svg>
                `;
            } else {
                videoElem.pause();
                // When paused, show play icon
                playPauseButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.78793 21.7594C9.04505 16.0567 9.04505 7.94326 5.78793 2.24055C5.67245 2.03836 5.96022 1.78503 6.14075 1.93209C12.5835 7.18046 16.1256 9.76256 20.5921 11.8152C20.7493 11.8874 20.7493 12.1126 20.5921 12.1848C16.1256 14.2374 12.5835 16.8195 6.14075 22.0679C5.96022 22.215 5.67245 21.9616 5.78793 21.7594Z" fill="white"/>
                </svg>
                `;
            }
            showControls();
            hideControlsDelayed();
        }

        videoElem.addEventListener("ended", () => {
            playPauseButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6,4 20,12 6,20" />
            </svg>
            `;
        });

        
        // Toggle fullscreen
        function toggleFullscreen() {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            } else {
                if (videoContainer.requestFullscreen) {
                    videoContainer.requestFullscreen();
                } else if (videoContainer.webkitRequestFullscreen) {
                    videoContainer.webkitRequestFullscreen();
                } else {
                    alert("Fullscreen is not supported on this browser or device.\nBest viewed on PC.");
                }
            }
            showControls();
            hideControlsDelayed();
        }
            
        // Event listeners for buttons and container
        playPauseButton.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePlayPause();
        });
    
        fullscreenButton.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFullscreen();
        });
      
        let hideControlsTimeout;
      
        // Show controls and cursor
        function showControls() {
          clearTimeout(hideControlsTimeout);
          playPauseButton.style.display = "block";
          soundButton.style.display = "block";
          fullscreenButton.style.display = "block";
          videoContainer.classList.add("video-overlay");
          videoContainer.classList.remove("hide-cursor");
        }

        // 즉시 컨트롤 숨기기 (마우스가 비디오 박스 밖으로 나갈 때 사용)
        function hideControlsImmediately() {
            clearTimeout(hideControlsTimeout);
            playPauseButton.style.display = "none";
            soundButton.style.display = "none";
            fullscreenButton.style.display = "none";
            videoContainer.classList.remove("video-overlay");
            videoContainer.classList.add("hide-cursor");
        }
      
        // Hide controls and cursor after delay
        function hideControlsDelayed() {
          clearTimeout(hideControlsTimeout);
          hideControlsTimeout = setTimeout(() => {
            playPauseButton.style.display = "none";
            soundButton.style.display = "none";
            fullscreenButton.style.display = "none";
            videoContainer.classList.remove("video-overlay");
            videoContainer.classList.add("hide-cursor");
          }, 1500);
        }

        // **추가: 토글 함수 분리**
        function toggleControls() {
            if (videoContainer.classList.contains("hide-cursor")) {
            showControls();
            hideControlsDelayed();
            } else {
            hideControlsImmediately();
            }
        }
        
        videoContainer.addEventListener("pointermove", (e) => {
            if (e.pointerType !== "mouse") return;  // 오직 마우스 이동일 때만
            showControls();
            hideControlsDelayed();
        });

        // clicking empty space when controldiv is visible
        videoContainer.addEventListener("pointerdown", (e) => {
            // 오직 빈 공간 터치/클릭만 처리
            if (
              e.target.closest(".play-pause-button") ||
              e.target.closest(".sound-button") ||
              e.target.closest(".fullscreen-button") ||
              e.target.closest(".volume-slider") ||
              isDraggingVolume
            ) return;
          
            toggleControls();
        });
          
        // 마우스가 비디오 밖으로 나가면 컨트롤 바로 숨김
        videoContainer.addEventListener("pointerleave", (e) => {
            if (e.pointerType !== "mouse") return;  // 오직 마우스 이동일 때만
            hideControlsImmediately();
        });
       
        // Optional: add caption if provided
        if (content.caption) {
          const caption = document.createElement("figcaption");
          caption.classList.add("video-caption");
          caption.textContent = content.caption;
          videoWrapper.appendChild(caption);
        }

        hideControlsImmediately();
      
        return videoWrapper;
    }
      
    // ------------------------ modal for img content ------------------------ //
    function initializeModal() {
        const modal = document.getElementById("modal");
        const modalImg = document.getElementById("modal-img");
        const closeBtns = document.querySelectorAll(".close");

        // 그리드 셀 자체에 클릭 이벤트를 위임
        const gridContainer = document.getElementById("gridfreex");

        gridContainer.addEventListener("click", (e) => {
            // 이미지가 클릭된 경우만 처리
            if (e.target && e.target.tagName === "IMG") {
                //console.log("Image clicked");
                modal.style.display = "block";
                modalImg.src = e.target.src;
            }
        });
    
        closeBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                modal.style.display = "none";
            });
        });
    
        // close if clicked outside image
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    }
    initializeModal();

    // ------------------------ on clicking works-item ------------------------ //
    worksItem.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            // data-id 속성을 직접 가져옴
            const workId = item.dataset.id;
            if (!workId) return; // workId가 없으면 아무것도 하지 않음

            history.pushState({ workId }, "", `/works/${workId}`);
            loadWorkDetail(workId); // 상세 데이터 로드
            showPage("works-detail"); // works-detail 페이지 활성

            // reflow
            gridfreexContainer.classList.remove("visible");
            void gridfreex.offsetWidth;
            gridfreexContainer.classList.add("visible");

            
        });
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> MISC <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
    // ------------------------ Highlighting mail adress ------------------------ //
    const mailLink = document.querySelector("[data-link='mail']");
    const mailText = document.getElementById("mailtext");
    if (mailLink && mailText) {
        mailLink.addEventListener("click", () => {
            // 이미 애니메이션 클래스가 있다면 제거 후 재추가
            mailText.classList.remove("highlight");
            // trigger reflow
            void mailText.offsetWidth;
            mailText.classList.add("highlight");
        });
    }
    
    // ------------------------ popstate ------------------------ //
    //console.log("popstate event listener added");
    setTimeout(() => {
        //console.log("Manually triggering popstate event");
        window.dispatchEvent(new Event("popstate"));
    }, 10);
    
    window.addEventListener("popstate", () => {
        const path = window.location.pathname.split("/").filter(Boolean);
    
        if (path[0] === "works" && typeof path[1] === "string" && path[1].trim() !== "") { // only if workId exists
            //console.log("Showing works-detail page first");
            // load works-data
            if (worksData[path[1]]) {
                //console.log("Loading work detail on popstate:", path[1]);
                loadWorkDetail(path[1]);
            } else {
                console.log("worksData not available yet. Waiting...");
                setTimeout(() => loadWorkDetail(path[1]), 100);
            }

            showPage("works-detail"); // works-detail 페이지 먼저 활성화

            // reflow
            gridfreexContainer.classList.remove("visible");
            void gridfreex.offsetWidth;
            gridfreexContainer.classList.add("visible");
        
        } else if (path[0] === "works") { // works-detail에서 works로 돌아가는 경우
            //console.log("Returning to works page from works-detail");
            showPage("works");
    
            // backTo 클릭 시 수행하는 동작 추가
            backToWorksScrollOffset();
            stopMedia();

        } else {
            //console.log("Showing page on popstate:", path[0] || "home");
            showPage(path[0] || "home");
        }
    });

});