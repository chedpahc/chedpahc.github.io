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
    const themes = ["light", "dark","zero", "one"];

    const storedTheme = localStorage.getItem("theme");
    // get system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    let initialTheme = storedTheme ? storedTheme : (prefersDark ? "dark" : "light");
    if (!themes.includes(initialTheme)) {
        initialTheme = "light";
    }
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
        case "dark":
            feFuncAList[0].setAttribute('slope', "1.25");
            feFuncAList[1].setAttribute('slope', "0.25");
            break;
        case "zero":
            feFuncAList[0].setAttribute('slope', "0");
            feFuncAList[1].setAttribute('slope', "0");
            break;
        case "one":
            feFuncAList[0].setAttribute('slope', "0");
            feFuncAList[1].setAttribute('slope', "0");
            break;
        default: // "light"
            feFuncAList[0].setAttribute('slope', "1");
            feFuncAList[1].setAttribute('slope', "0.75");
        }
    }
    setTheme(initialTheme);

    // ------------------------ Theme cycle button ------------------------ //
    const themeCycleButton = document.querySelector("#theme-cycle");
    function updateToggleButton(theme) {
        if (themeCycleButton) {
        let text;
        switch (theme) {
            case "light":
            text = "0.72";
            break;
            case "one":
            text = "1.00";
            break;
            case "dark":
            text = "0.56";
            break;
            case "zero":
            text = "0.00";
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
    const backToText = document.getElementById("back-to-text");
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
          console.log(varVW);
        } else {
          varVW = parseFloat(rootStyles.getPropertyValue('--base-vw'));
          console.log(varVW);
        }
        
        // Calculate extra space and corresponding mask stops:
        const extra = 100 - varVW;
        const leftGap = extra / 2;
        const leftStop = (leftGap / 100) * 100 + 1;
        const rightStop = 100 - leftStop;
        
        headerTextWrapper.style.setProperty('--mask-stop-left', `${leftStop}%`);
        headerTextWrapper.style.setProperty('--mask-stop-right', `${rightStop}%`);
        console.log(leftStop, rightStop);
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
        
        let currentFontSize = window.innerWidth <= 768 ? 45 : 50;
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
        
            // 1) If this is a year (except "older") and "older" is active, remove "older"
            if (button.classList.contains("year") && filterTag !== "older" && selectedTags.has("older")) {
                selectedTags.delete("older");
                document.querySelector(".tag-button[data-tag='older']").classList.remove("active");
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
        savedScrollY = window.pageYOffset; // save scroll point before loading detail

        const work = worksData[workId];
        if (!work) return;

        const container = document.getElementById("gridfreex");
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

    // ------------------------ Text ------------------------ //
    async function createTextContent(content, iscvTextData = false) {
        let textContent = "";

        if (typeof content === "object" && content.file) {
            try {
            const response = await fetch(content.file);
            if (!response.ok) throw new Error("Failed to fetch text file");
            textContent = await response.text();

            // Normalize newline characters to "\n"
            textContent = textContent.replace(/\r\n/g, "\n");
            // Replace each newline with <br>
            textContent = textContent.replace(/\n/g, "<br>");
            
            } catch (error) {
            console.error("Error loading TXT file:", error);
            textContent = "Error loading content";
            }
        } else if (typeof content === "object") {
          textContent = content.text || "";
        } else {
          textContent = content;
        }

        // Hyperlink formatting (Regular Expression)
        textContent = textContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // CV formatting (Regular Expression)
        if (iscvTextData) {
            let isFirstTitle = true;
            // Replace [ ] 
            textContent = textContent.replace(/\[([^\]]+)\]/g, (match, p1) => {
                // If it's the first [ ] content, apply 'cvtitlebig'
                if (isFirstTitle) {
                    isFirstTitle = false;
                    return `<span class="cvtitlebig">${p1}</span>`;
                } else {
                    return `<span class="cvtitle">${p1}</span>`;
                }
            });
            // Replace < > content with 'mailtext' id
            textContent = textContent.replace(/-([^<]+)-/g, (match, p1) => {
                return `<span id="mailtext">${p1}</span>`;
            });
        }
    
        const elem = document.createElement("div");
        if (typeof content === "object" && content.classes) {
          content.classes.split(" ").forEach(cls => {
            if (cls.trim()) elem.classList.add(cls.trim());
          });
        }
        elem.innerHTML = textContent;
        return elem;
    }

    // ------------------------ Audio ------------------------ //
    const waveInstances = [];
    const waveColor = getComputedStyle(document.documentElement).getPropertyValue('--color-item-active').trim();
    const progressColor = getComputedStyle(document.documentElement).getPropertyValue('--color-waveprogress').trim();

    function createAudioContent(item, content) {
        // Create a wrapper for the audio content
        const audioWrapper = document.createElement("div");
        audioWrapper.classList.add("audio-wrapper");

        const waveContainer = document.createElement("div");
        waveContainer.classList.add("waveform");
        waveContainer.id = `waveform-${item}`;

        // Append container to wrapper
        audioWrapper.appendChild(waveContainer);

        // Initialize WaveSurfer instance using the container element
        const waveSurfer = WaveSurfer.create({
            container: waveContainer,
            waveColor: waveColor, 
            progressColor: progressColor,
            barWidth: 2,
            cursorColor: progressColor,
            cursorWidth: 1,
            responsive: true,
            backend: 'WebAudio',
            normalize: true,
        });
        waveSurfer.load(content.src);
        waveInstances.push(waveSurfer);
        

        // Toggle play on waveform click
        waveContainer.addEventListener("click", () => {
            if (waveSurfer.isPlaying()) {
            waveSurfer.pause();
            } else {
            waveSurfer.play();
            }
        });

        // Optionally add caption if provided
        if (content.caption) {
            const caption = document.createElement("figcaption");
            caption.textContent = content.caption;
            audioWrapper.appendChild(caption);
        }
        return audioWrapper;
    }

    // ------------------------ Image ------------------------ //
    function createImageContent(content) {
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        if (typeof content === "object") {
            img.src = content.src;
            if (content.caption) {
            const figcaption = document.createElement("figcaption");
            figcaption.textContent = content.caption;
            figure.appendChild(img);
            figure.appendChild(figcaption);
            } else {
            figure.appendChild(img);
            }
        } else {
            img.src = content;
            figure.appendChild(img);
        }
        return figure;
    }

    // ------------------------ Video ------------------------ //
    function createVideoContent(content) {
        // video-wrapper 생성
        const videoWrapper = document.createElement("div");
        videoWrapper.classList.add("video-wrapper");
      
        // 비디오를 감쌀 컨테이너 생성 (position: relative)
        const videoContainer = document.createElement("div");
        videoContainer.classList.add("video-container");
      
        // video 요소 생성 (HTML5 video 태그)
        const videoElem = document.createElement("video");
        videoElem.controls = false; // 네이티브 컨트롤 제거
        videoElem.setAttribute("preload", "auto");
      
        // source 설정 (mp4 URL로 가정)
        const sourceElem = document.createElement("source");
        sourceElem.src = content.src;
        sourceElem.type = "video/mp4";
        videoElem.appendChild(sourceElem);
      
        // poster 이미지 설정 (있다면)
        if (content.poster) {
          videoElem.setAttribute("poster", content.poster);
        }
      
        // aspectRatio 처리
        let ratio = "16/9"; // 기본값
        if (content.aspectRatio) {
          ratio = content.aspectRatio;
        }
        videoContainer.style.aspectRatio = ratio.replace("/", " / ");
      
        // video 요소를 컨테이너에 추가
        videoContainer.appendChild(videoElem);
        videoWrapper.appendChild(videoContainer);
      
        // controls-div 생성 (비디오 컨테이너 내부에 위치)
        const controlsDiv = document.createElement("div");
        controlsDiv.classList.add("controls-div");
      
        // 사운드 버튼 (mute/unmute)
        const soundButton = document.createElement("div");
        soundButton.classList.add("sound-button");
        soundButton.innerHTML = "&#128266;&#65038;"; // unmuted 상태
        controlsDiv.appendChild(soundButton);
      
        // Play/Pause 버튼
        const playPauseButton = document.createElement("div");
        playPauseButton.classList.add("play-pause-button");
        playPauseButton.innerHTML = "&#9654;"; // ▶ 모양
        controlsDiv.appendChild(playPauseButton);
      
        // 전체 화면 버튼
        const fullscreenButton = document.createElement("div");
        fullscreenButton.classList.add("fullscreen-button");
        fullscreenButton.innerHTML = "⛶"; // ⛶ 모양
        controlsDiv.appendChild(fullscreenButton);
      
        // controlsDiv를 videoContainer 내부에 추가
        videoContainer.appendChild(controlsDiv);
      
        let hideControlsTimeout;
      
        // 컨트롤 보이기 함수: 모든 컨트롤 즉시 표시
        function showControls() {
          clearTimeout(hideControlsTimeout);
          playPauseButton.style.display = 'block';
          soundButton.style.display = 'block';
          fullscreenButton.style.display = 'block';
          videoContainer.classList.add("video-overlay");
        }
      
        // 컨트롤 숨김 함수: 1초 후에 모든 컨트롤 숨김
        function hideControlsDelayed() {
          clearTimeout(hideControlsTimeout);
          hideControlsTimeout = setTimeout(() => {
            playPauseButton.style.display = 'none';
            soundButton.style.display = 'none';
            fullscreenButton.style.display = 'none';
            videoContainer.classList.remove("video-overlay");
          }, 1000);
        }
      
        // 플레이/일시정지 토글 함수
        function togglePlayPause() {
          if (videoElem.paused) {
            videoElem.play();
            playPauseButton.innerHTML = "&#10074;&#10074;"; // Pause 아이콘 (||)
          } else {
            videoElem.pause();
            playPauseButton.innerHTML = "&#9654;"; // Play 아이콘 (▶)
          }
          showControls();
          hideControlsDelayed();
        }
      
        // 사운드 토글 함수 (mute/unmute)
        function toggleSound() {
          videoElem.muted = !videoElem.muted;
          soundButton.innerHTML = videoElem.muted 
            ? "&#128263;&#65038;"  // Muted: 🔇 (텍스트 스타일)
            : "&#128266;&#65038;"; // Unmuted: 🔊︎ (텍스트 스타일)
          showControls();
          hideControlsDelayed();
        }
      
        // 전체 화면 토글 함수
        function toggleFullscreen() {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            videoContainer.requestFullscreen();
          }
          showControls();
          hideControlsDelayed();
        }
      
        // 이벤트 핸들러 등록
        // 버튼 클릭 시: 이벤트 전파 차단
        playPauseButton.addEventListener("click", (e) => {
          e.stopPropagation();
          togglePlayPause();
        });
        soundButton.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleSound();
        });
        fullscreenButton.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleFullscreen();
        });
      
        // videoContainer 내부에서 마우스 움직임이 있으면 즉시 보이고 hide 타이머 재설정
        videoContainer.addEventListener("mousemove", () => {
          showControls();
          hideControlsDelayed();
        });
      
        // videoContainer 클릭(컨트롤 영역 외) 시 플레이/일시정지 토글
        videoContainer.addEventListener("click", (e) => {
          // 만약 클릭 대상이 controlsDiv 내부의 요소라면 이벤트를 이미 처리했으므로 건너뛰기
          if (e.target.closest(".controls-div")) return;
          togglePlayPause();
        });
      
        // 더블 클릭 시 전체 화면 토글
        videoContainer.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          toggleFullscreen();
        });
      
        // 비디오 이벤트: 재생 또는 일시정지 시 컨트롤 보이기와 숨김 타이머 실행
        videoElem.addEventListener('play', () => {
          playPauseButton.innerHTML = "&#10074;&#10074;";
          showControls();
          hideControlsDelayed();
        });
        videoElem.addEventListener('pause', () => {
          playPauseButton.innerHTML = "&#9654;";
          showControls();
          hideControlsDelayed();
        });

          // 캡션 추가 (옵션)
        if (content.caption) {
            const caption = document.createElement("figcaption");
            caption.classList.add("video-caption");
            caption.textContent = content.caption;
            videoWrapper.appendChild(caption);
        }
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
                console.log("Image clicked");
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
    window.addEventListener("popstate", () => {
        const path = window.location.pathname.split("/").filter(Boolean);
        if (path[0] === "works" && worksData[path[1]]) {
            loadWorkDetail(path[1]);
            showPage("works-detail");
        } else {
            showPage(path[0] || "home");
        }
        if (mailText) {
            mailText.classList.remove("highlight");
        }
        backToWorksScrollOffset();
        stopMedia()
    });

    // ------------------------ check URL on page load ------------------------ //
    const currentPath = window.location.pathname.split("/").filter(Boolean);
    console.log("checking url on page load", window.location.pathname, window.location.pathname.split("/").filter(Boolean))
    if (currentPath[0] === "works" && worksData[currentPath[1]]) {
        console.log("current path is works", currentPath[0])
        loadWorkDetail(currentPath[1]);
        
    } else {
        showPage(currentPath[0] || "home");
        console.log("current path is not works", currentPath[0])
    }
});