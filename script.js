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

    // load ui data from json
    try {
        const uiResponse = await fetch(`/lang/ui_${langCode}.json`);
        uiData = await uiResponse.json();
        //console.log("UI Data loaded:", uiData);
    } catch (error) {
        console.error("Error loading UI JSON file:", error);
    }

    // load works data from json
    try {
        const worksResponse = await fetch(`/lang/works_${langCode}.json`);
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

    

    // ------------------------ Theme detection ------------------------ //
    const storedTheme = localStorage.getItem("theme");
    // get system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme ? storedTheme : (prefersDark ? "dark" : "light");

    // setting theme in css
    function setTheme(theme) {
        if (theme === "dark") {
            document.documentElement.classList.add("dark-mode");
        } else {
            document.documentElement.classList.remove("dark-mode");
        }
        localStorage.setItem("theme", theme);
        }
    setTheme(theme);

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
    
    // ------------------------ Theme toggle ------------------------ //
    const themeToggleButton = document.querySelector("#theme-toggle");
    // theme toggle
    function updateToggleButton(theme) {
        // 버튼 텍스트를 현재 테마의 반대 모드로 표시 (클릭하면 전환될 모드)
        if (themeToggleButton) {
            themeToggleButton.innerHTML = `<span class="pressable-text">${theme === "dark" ? "0.564" : "0.721"}</span>`;
        }
    }
    if (themeToggleButton) {
        updateToggleButton(theme);
        themeToggleButton.addEventListener("click", () => {
        // 현재 테마가 dark이면 light로, 아니면 dark로 전환
        const newTheme = (document.documentElement.classList.contains("dark-mode") ? "light" : "dark");
        setTheme(newTheme);
        updateToggleButton(newTheme);
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
    const filterButtons = document.querySelectorAll(".tag-button");
    const textcontent = document.querySelector(".tag-text");
    const worksItem = document.querySelectorAll(".works-item");
    const mailLink = document.querySelector("[data-link='mail']");
    const mailText = document.getElementById("mailtext");
    const grid5xContainer = document.querySelector(".grid5x-container"); // it's not grid5x-wrapper nor grid5x itself.. stupid but works

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
    function updateHeaderVisibility(page) {
        if (page && (page.id === "works" || page.id === "works-detail")) {
            header.classList.remove("hidden");
            backTo.innerHTML = (page.id === "works-detail")
            ? '<span class="pressable-text">← ↚ ↫ ⟵ ⟸ ⬰ ⬺ 🡨 🡰 ⟻ ⟽ ⬲ ⬾ ⮄ ⭠ 🡠 ⮘ ⮜</span>'
            : '<span class="pressable-text">↞ ↤ ↫ ⟻ ⟽ ← ↚ </span>';
        } else {
            header.classList.add("hidden");
        }
    }    

    // ------------------------ "about" + "works" navigation ------------------------ //
    // #about page open/close handlers
    document.getElementById("go-to-about").addEventListener("click", () => {
        if (document.getElementById("about").classList.contains("active")) return;
        history.pushState({}, "", "/about");
        showPage("about");
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

    // #about page external links
    document.querySelectorAll(".grid2x-item").forEach(item => {
    item.addEventListener("click", event => {
        const link = item.getAttribute("data-link");
        if (link === "mail") return; // mail은 제외
        window.open(link, "_blank");
        });
    });

    // on clicking "works"
    document.getElementById("go-to-works").addEventListener("click", () => {
        history.pushState({}, "", "/works");
        showPage("works");
    });

    // ------------------------ Calculating scroll offset in #works-search page ------------------------ //
    function backToWorksScrollOffset() {
        savedScrollYinDetail = window.pageYOffset; // scroll value inside detail page
        grid5xContainer.style.marginTop = (savedScrollY - savedScrollYinDetail) + "px"; //set final offset

        window.scrollTo(0, savedScrollY); // revert scroll position from previous #works page
        grid5xContainer.classList.remove("visible");
    
        setTimeout(() => {
            grid5xContainer.style.marginTop = "0px"; // remove margin after transition
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
            stopAudio()
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
            history.pushState({}, "", "/");
            showPage("home");
            //reset
            //search.classList.remove("visible");
        }
    });
    
    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> FILTERING WORKS <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
    // ------------------------ Dynamic Tag text size ------------------------ //
    function adjustTagTextFontSize() {
        const container = document.querySelector(".tag-area-text");
        if (!container || !textcontent) return;
        
        let currentFontSize = window.innerWidth <= 768 ? 33 : 40;
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
            let translatedTag = uiData.translations[translationKey] || (tag.charAt(0).toUpperCase() + tag.slice(1));

            // "co-work" 처리: "co-work" → "co"
            if (translatedTag.toLowerCase().includes("co-work")) {
                translatedTag = translatedTag.replace(/work/i, ""); // "-work" 또는 "work" 제거
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
    const waveInstances = [];
    const waveColor = getComputedStyle(document.documentElement).getPropertyValue('--color-item-hover').trim();
    //const progressColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();

    function stopAudio() {
        waveInstances.forEach(instance => {
            if (instance && instance.isPlaying()) {
                instance.pause();
            }
            //instance.destroy();
        });
        // Optionally clear the array:
        waveInstances.length = 0;
    }

    // ------------------------ Load work content and form Grid5x layout from json data ------------------------ //

    function loadWorkDetail(workId) {
    savedScrollY = window.pageYOffset; // save scroll point before loading detail

    const work = worksData[workId];
    if (!work) return;

    const container = document.getElementById("grid5x");
    container.innerHTML = ""; // Clear existing content

    const rowCount = work.layout.length;
    const colCount = work.layout[0].length;
    const visited = Array.from({ length: rowCount }, () => Array(colCount).fill(false));

    work.layout.forEach((row, rowIndex) => {
        row.forEach((item, colIndex) => {
        if (visited[rowIndex][colIndex]) return;

        // Create the grid cell element
        const cell = document.createElement("div");
        cell.classList.add("grid5x-cell");

        // Calculate span sizes
        const { colSpan, rowSpan } = calculateSpanSizes(work.layout, rowIndex, colIndex, colCount, rowCount, item);
        if (colSpan > 1) cell.style.gridColumn = `span ${colSpan}`;
        if (rowSpan > 1) cell.style.gridRow = `span ${rowSpan}`;

        markVisited(visited, rowIndex, colIndex, rowSpan, colSpan);

        // Create the cell content based on its type
        const content = work.content[item];
        if (content) {
            cell.classList.add(item);
            let contentElem = createContentElement(item, content);
            if (contentElem) {
            cell.appendChild(contentElem);
            }
        }

        container.appendChild(cell);
        });
    });

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

    function createTextContent(content) {
    const elem = document.createElement("div");
    let textContent = "";
    if (typeof content === "object") {
        textContent = content.text || "";
        if (content.classes) {
        content.classes.split(" ").forEach(cls => {
            if (cls.trim()) elem.classList.add(cls.trim());
        });
        }
    } else {
        textContent = content;
    }
    elem.innerHTML = textContent;
    return elem;
    }

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
        progressColor: '#333333',
        barWidth: 2,
        cursorColor: '#333333',
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

    function createVideoContent(content) {
    const videoWrapper = document.createElement("div");
    videoWrapper.classList.add("video-wrapper");

    const videoContainer = document.createElement("div");
    videoContainer.classList.add("iframe-container");

    let iframeHTML, ratio, captionText;
    if (typeof content === "object") {
        iframeHTML = content.iframe;
        ratio = content.aspectRatio;
        captionText = content.caption;
    } else {
        iframeHTML = content;
        ratio = "16/9"; // default ratio
        captionText = "";
    }

    videoContainer.innerHTML = iframeHTML;
    videoContainer.style.aspectRatio = ratio.replace("/", " / ");
    videoWrapper.appendChild(videoContainer);

    if (captionText) {
        const caption = document.createElement("figcaption");
        caption.textContent = captionText;
        caption.classList.add("video-caption");
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
        const gridContainer = document.getElementById("grid5x");

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

            grid5xContainer.classList.remove("visible");
            void grid5x.offsetWidth;
            grid5xContainer.classList.add("visible");
        });
    });

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> MISC <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< //
    // ------------------------ Highlighting mail adress ------------------------ //
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
        stopAudio()
    });

    // ------------------------ check URL on page load ------------------------ //
    const currentPath = window.location.pathname.split("/").filter(Boolean);
    if (currentPath[0] === "works" && worksData[currentPath[1]]) {
        loadWorkDetail(currentPath[1]);
    } else {
        showPage(currentPath[0] || "home");
    }
});

