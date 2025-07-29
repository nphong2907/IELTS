// script.js

// --- Biến toàn cục để lưu dữ liệu ---
let examData = null; // Lưu trữ dữ liệu đề thi từ JSON
let userResponses = {}; // Lưu trữ đáp án của người dùng
let totalQuestionsCount = 0; // Thêm biến để lưu tổng số câu hỏi

// --- Chức năng kéo thanh điều chỉnh ---
const resizer = document.getElementById('resizer');
const leftPanel = document.querySelector('.left-panel');
const rightPanel = document.querySelector('.right-panel');
const mainContent = document.querySelector('.test-main-content');
const progressBar = document.getElementById('progressBar');

let isResizing = false;
let startX;
let startWidthLeft;
let startWidthRight;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidthLeft = leftPanel.offsetWidth;
    startWidthRight = rightPanel.offsetWidth;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    let newLeftWidth = startWidthLeft + deltaX;
    let newRightWidth = startWidthRight - deltaX;

    const minWidth = 200;
    const containerWidth = mainContent.offsetWidth;
    const resizerWidth = resizer.offsetWidth;

    if (newLeftWidth < minWidth) {
        newLeftWidth = minWidth;
        newRightWidth = containerWidth - minWidth - resizerWidth;
    } else if (newRightWidth < minWidth) {
        newRightWidth = minWidth;
        newLeftWidth = containerWidth - minWidth - resizerWidth;
    }

    leftPanel.style.width = `${newLeftWidth}px`;
    rightPanel.style.width = `${newRightWidth}px`;

    e.preventDefault();
});

document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
});


// --- Chức năng tải và hiển thị nội dung đề thi từ JSON ---
async function loadExamContent() {
    try {
        const response = await fetch('exam_data.json');
        examData = await response.json();

        // HIỂN THỊ ĐOẠN VĂN
        const readingPassageDiv = document.getElementById('readingPassage');
        const passageSection = examData.sections.find(s => s.sectionId === 'passage1');
        if (passageSection) {
            readingPassageDiv.innerHTML = `<h2>${passageSection.title || ''}</h2>
                                          <p>${passageSection.instruction || ''}</p>
                                          <p>${passageSection.passage.replace(/\n/g, '</p><p>')}</p>`;
        }

        // HIỂN THỊ CÂU HỎI
        const questionsSectionDiv = document.querySelector('.questions-section');
        questionsSectionDiv.innerHTML = '';
        
        const questionSection = examData.sections.find(s => s.sectionId === 'questions');
        if (questionSection) {
            totalQuestionsCount = 0; // Reset tổng số câu hỏi trước khi đếm lại
            questionSection.questions.forEach(q => {
                const questionBlock = document.createElement('div');
                questionBlock.classList.add('question-block');
                // Điều chỉnh ID để lấy số đầu tiên của câu hỏi trong khối đó
                const startQNum = q.id.match(/\d+/)?.[0] || '';
                questionBlock.id = `question-block-${startQNum}`; 

                let questionHtml = `<h2>Questions ${q.id.replace('q', '').replace('-', ' to ')}</h2>
                                    <p>${q.instruction}</p>`;

                if (q.type === 'true_false_not_given') {
                    q.statements.forEach(stmt => {
                        totalQuestionsCount++;
                        // Giữ nguyên p và div cho TFNG
                        questionHtml += `
                            <p id="q${stmt.qNum}"><strong>${stmt.qNum}.</strong> ${stmt.text}</p>
                            <div class="tfng-options" data-qnum="${stmt.qNum}">
                                <label><input type="radio" name="q${stmt.qNum}" value="TRUE"> TRUE</label>
                                <label><input type="radio" name="q${stmt.qNum}" value="FALSE"> FALSE</label>
                                <label><input type="radio" name="q${stmt.qNum}" value="NOT GIVEN"> NOT GIVEN</label>
                            </div>
                        `;
                    });
                } else if (q.type === 'complete_notes') {
                    q.notes_sections.forEach(noteSec => {
                        if (noteSec.heading) {
                            questionHtml += `<h3 class="notes-heading">${noteSec.heading}</h3>`; // Thêm class
                        }
                        questionHtml += '<ul class="notes-list">'; // Bắt đầu ul
                        
                        // Xử lý subsections trước
                        if (noteSec.subsections && noteSec.subsections.length > 0) {
                            noteSec.subsections.forEach(subSec => {
                                if (subSec.subheading) {
                                    questionHtml += `<li><p class="notes-subheading"><strong>${subSec.subheading}</strong></p></li>`; // Li chứa p in đậm
                                }
                                subSec.items.forEach(item => {
                                    if (item.qNum) { // Nếu có qNum, đây là câu hỏi điền
                                        totalQuestionsCount++; // Chỉ đếm câu hỏi có input
                                        const textWithoutQNum = item.text.replace(item.qNum.toString() + '. ', '');
                                        const textWithInput = textWithoutQNum.replace('____', `<input type="text" class="q-input" data-qnum="${item.qNum}" placeholder="${item.qNum}">`);
                                        questionHtml += `<li id="q${item.qNum}">${textWithInput}</li>`; // Sử dụng li
                                    } else { // Nếu không có qNum, đây là dòng ghi chú
                                        questionHtml += `<li>${item.text}</li>`; // Sử dụng li đơn thuần
                                    }
                                });
                            });
                        } else if (noteSec.items && noteSec.items.length > 0) { // Xử lý nếu notes_sections có items trực tiếp (không qua subsections)
                            noteSec.items.forEach(item => {
                                if (item.qNum) {
                                    totalQuestionsCount++; // Chỉ đếm câu hỏi có input
                                    const textWithoutQNum = item.text.replace(item.qNum.toString() + '. ', '');
                                    const textWithInput = textWithoutQNum.replace('____', `<input type="text" class="q-input" data-qnum="${item.qNum}" placeholder="${item.qNum}">`);
                                    questionHtml += `<li id="q${item.qNum}">${textWithInput}</li>`;
                                } else {
                                    questionHtml += `<li>${item.text}</li>`;
                                }
                            });
                        }
                        
                        questionHtml += '</ul>'; // Kết thúc ul
                    });
                }
                
                questionBlock.innerHTML = questionHtml;
                questionsSectionDiv.appendChild(questionBlock);
            });
        }

        updatePagination();
        updateAnsweredStatus();
        updateProgressBar();
        loadUserResponses(); // Tải đáp án người dùng đã lưu
        applySavedFontSize(); // Áp dụng cỡ chữ đã lưu
        
    } catch (error) {
        console.error('Lỗi khi tải nội dung bài thi:', error);
        alert('Không thể tải đề thi. Vui lòng kiểm tra file exam_data.json hoặc kết nối mạng.');
    }
}

// Hàm cập nhật nút số câu hỏi ở footer
function updatePagination() {
    const paginationList = document.querySelector('.question-pagination');
    paginationList.innerHTML = '';

    if (!examData) return;

    const questionSection = examData.sections.find(s => s.sectionId === 'questions');
    if (questionSection) {
        const allQuestionNumbers = [];
        questionSection.questions.forEach(qBlock => {
            if (qBlock.type === 'true_false_not_given') {
                qBlock.statements.forEach(stmt => allQuestionNumbers.push(stmt.qNum));
            } else if (qBlock.type === 'complete_notes') {
                if (qBlock.notes_sections) {
                    qBlock.notes_sections.forEach(noteSec => {
                        if (noteSec.subsections) {
                            noteSec.subsections.forEach(subSec => {
                                subSec.items.forEach(item => {
                                    if (item.qNum) allQuestionNumbers.push(item.qNum);
                                });
                            });
                        } else if (noteSec.items) { // Xử lý nếu notes_sections có items trực tiếp
                            noteSec.items.forEach(item => {
                                if (item.qNum) allQuestionNumbers.push(item.qNum);
                            });
                        }
                    });
                }
            }
        });
        
        allQuestionNumbers.sort((a, b) => a - b);

        // Nút "Part 1"
        const liPart1 = document.createElement('li');
        const buttonPart1 = document.createElement('button');
        buttonPart1.classList.add('q-num', 'part-label');
        buttonPart1.textContent = 'Part 1';
        if (allQuestionNumbers.length > 0) {
            buttonPart1.addEventListener('click', () => scrollToQuestion(allQuestionNumbers[0]));
        } else {
            buttonPart1.disabled = true;
        }
        liPart1.appendChild(buttonPart1);
        paginationList.appendChild(liPart1);


        allQuestionNumbers.forEach(qNum => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.classList.add('q-num');
            button.textContent = qNum;
            button.setAttribute('data-q-id', qNum);
            
            button.addEventListener('click', () => scrollToQuestion(qNum));

            li.appendChild(button);
            paginationList.appendChild(li);
        });
    }
}

// Hàm cuộn đến vị trí câu hỏi
function scrollToQuestion(qNum) {
    const questionElement = document.getElementById(`q${qNum}`);
    if (questionElement) {
        const rightPanel = document.querySelector('.right-panel');
        const headerOffset = 20; // Khoảng cách offset từ trên xuống
        
        rightPanel.scrollTo({
            top: questionElement.offsetTop - headerOffset,
            behavior: 'smooth'
        });

        document.querySelectorAll('.question-pagination .q-num').forEach(btn => {
            btn.classList.remove('active');
        });
        const clickedButton = document.querySelector(`.question-pagination .q-num[data-q-id="${qNum}"]`);
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
    }
}

// Hàm cập nhật trạng thái đã trả lời của các nút pagination
function updateAnsweredStatus() {
    const questionSection = examData.sections.find(s => s.sectionId === 'questions');
    if (!questionSection) return;

    let answeredCount = 0;

    questionSection.questions.forEach(qBlock => {
        if (qBlock.type === 'true_false_not_given') {
            qBlock.statements.forEach(stmt => {
                const qNum = stmt.qNum;
                const answered = userResponses[qNum] !== undefined && userResponses[qNum] !== '';
                const qNumButton = document.querySelector(`.question-pagination .q-num[data-q-id="${qNum}"]`);
                if (qNumButton) {
                    if (answered) {
                        qNumButton.classList.add('answered');
                        answeredCount++;
                    } else {
                        qNumButton.classList.remove('answered');
                    }
                }
            });
        } else if (qBlock.type === 'complete_notes') {
            const itemsToProcess = [];
            if (qBlock.notes_sections) {
                qBlock.notes_sections.forEach(noteSec => {
                    if (noteSec.subsections) {
                        noteSec.subsections.forEach(subSec => {
                            subSec.items.forEach(item => {
                                if (item.qNum) itemsToProcess.push(item); // Chỉ xử lý items có qNum
                            });
                        });
                    } else if (noteSec.items) { // Xử lý nếu notes_sections có items trực tiếp
                        noteSec.items.forEach(item => {
                            if (item.qNum) itemsToProcess.push(item);
                        });
                    }
                });
            }

            itemsToProcess.forEach(item => {
                const qNum = item.qNum;
                const answered = userResponses[qNum] !== undefined && userResponses[qNum].trim() !== '';
                const qNumButton = document.querySelector(`.question-pagination .q-num[data-q-id="${qNum}"]`);
                if (qNumButton) {
                    if (answered) {
                        qNumButton.classList.add('answered');
                        answeredCount++;
                    } else {
                        qNumButton.classList.remove('answered');
                    }
                }
            });
        }
    });
    updateProgressBar(answeredCount);
}

// Hàm cập nhật thanh tiến độ
function updateProgressBar(answeredCount = 0) {
    if (totalQuestionsCount === 0) {
        progressBar.style.width = '0%';
        return;
    }
    const progressPercentage = (answeredCount / totalQuestionsCount) * 100;
    progressBar.style.width = `${progressPercentage}%`;
}


// --- Xử lý lưu trữ đáp án của người dùng và ẩn/hiện placeholder / in đậm TFNG ---
document.addEventListener('input', (e) => {
    // Complete Notes (text inputs)
    if (e.target.matches('input[type="text"][data-qnum]')) {
        const qNum = e.target.dataset.qnum;
        userResponses[qNum] = e.target.value;
        saveUserResponses(); // Lưu đáp án
        
        if (e.target.value.trim() !== '') {
            e.target.classList.add('has-value');
        } else {
            e.target.classList.remove('has-value');
        }
        updateAnsweredStatus();
    }
    // True/False/Not Given (radio buttons)
    if (e.target.matches('input[type="radio"]')) {
        const qNum = e.target.name.replace('q', '');
        userResponses[qNum] = e.target.value;
        saveUserResponses(); // Lưu đáp án

        const tfngOptionsDiv = e.target.closest('.tfng-options');
        if (tfngOptionsDiv) {
            tfngOptionsDiv.querySelectorAll('label').forEach(label => {
                label.classList.remove('selected-bold');
            });
            e.target.closest('label').classList.add('selected-bold');
        }
        updateAnsweredStatus();
    }
});

// Lưu đáp án vào Local Storage
function saveUserResponses() {
    localStorage.setItem('ieltsUserResponses', JSON.stringify(userResponses));
}

// Tải đáp án từ Local Storage
function loadUserResponses() {
    const savedResponses = localStorage.getItem('ieltsUserResponses');
    if (savedResponses) {
        userResponses = JSON.parse(savedResponses);
        // Điền lại đáp án vào form
        for (const qNum in userResponses) {
            const responseValue = userResponses[qNum];
            // Đối với radio buttons
            const radio = document.querySelector(`input[type="radio"][name="q${qNum}"][value="${responseValue}"]`);
            if (radio) {
                radio.checked = true;
                const tfngOptionsDiv = radio.closest('.tfng-options');
                if (tfngOptionsDiv) {
                    tfngOptionsDiv.querySelectorAll('label').forEach(label => {
                        label.classList.remove('selected-bold');
                    });
                    radio.closest('label').classList.add('selected-bold');
                }
            }
            // Đối với text inputs
            const textInput = document.querySelector(`input[type="text"][data-qnum="${qNum}"]`);
            if (textInput) {
                textInput.value = responseValue;
                if (responseValue.trim() !== '') {
                    textInput.classList.add('has-value');
                } else {
                    textInput.classList.remove('has-value');
                }
            }
        }
        updateAnsweredStatus(); // Cập nhật trạng thái pagination sau khi load
    }
}


// --- Chức năng chấm điểm và hiển thị kết quả ---
function checkAndDisplayResults() {
    if (!examData) {
        alert('Chưa có dữ liệu đề thi để chấm điểm.');
        return;
    }

    const questionSection = examData.sections.find(s => s.sectionId === 'questions');
    if (!questionSection) return;

    let totalCorrect = 0;
    let totalQuestions = 0; // Đếm số câu hỏi thực sự có đáp án để chấm
    let resultsHtml = '<h3>Kết quả của bạn:</h3>';

    // Ẩn tất cả các highlight chấm điểm cũ
    document.querySelectorAll('.result-indicator, .correct-answer-box').forEach(el => el.remove());
    document.querySelectorAll('.correct-selected, .incorrect-selected').forEach(el => {
        el.classList.remove('correct-selected', 'incorrect-selected');
    });
    document.querySelectorAll('.q-input.correct-selected, .q-input.incorrect-selected').forEach(el => {
        el.classList.remove('correct-selected', 'incorrect-selected');
    });


    questionSection.questions.forEach(qBlock => {
        if (qBlock.type === 'true_false_not_given') {
            qBlock.statements.forEach(stmt => {
                totalQuestions++; // Tăng totalQuestions
                const userAnswer = (userResponses[stmt.qNum] || '').toLowerCase().trim();
                const correctAnswer = (stmt.answers[stmt.qNum] || '').toLowerCase().trim();
                const isCorrect = (userAnswer === correctAnswer);
                if (isCorrect) totalCorrect++;

                // Lấy phần tử tfng-options
                const tfngOptionsDiv = document.querySelector(`.tfng-options[data-qnum="${stmt.qNum}"]`);
                if (tfngOptionsDiv) {
                    // Cập nhật class cho lựa chọn của người dùng (vẫn giữ màu xanh/đỏ)
                    const selectedLabel = tfngOptionsDiv.querySelector(`input[name="q${stmt.qNum}"][value="${userResponses[stmt.qNum]}"]`)?.closest('label');
                    if (selectedLabel) {
                        selectedLabel.classList.add(isCorrect ? 'correct-selected' : 'incorrect-selected');
                    }
                    
                    // Highlight đáp án đúng nếu người dùng chọn sai hoặc chưa trả lời
                    if (!isCorrect) {
                        const correctLabel = tfngOptionsDiv.querySelector(`input[name="q${stmt.qNum}"][value="${stmt.answers[stmt.qNum]}"]`)?.closest('label');
                        if (correctLabel) {
                            correctLabel.classList.add('correct-selected'); // Highlight đáp án đúng bằng màu xanh
                        }
                    }
                }

                resultsHtml += `
                    <p><strong>Câu ${stmt.qNum}: ${stmt.text}</strong><br>
                    Trả lời của bạn: <span style="color: ${isCorrect ? 'green' : 'red'};">${userResponses[stmt.qNum] || 'Chưa trả lời'}</span><br>
                    Đáp án đúng: <span style="color: green;">${stmt.answers[stmt.qNum]}</span>
                    </p>
                `;
            });
        } else if (qBlock.type === 'complete_notes') {
            const itemsToProcessForGrading = [];
            if (qBlock.notes_sections) {
                qBlock.notes_sections.forEach(noteSec => {
                    if (noteSec.subsections) {
                        noteSec.subsections.forEach(subSec => {
                            subSec.items.forEach(item => {
                                if (item.qNum) itemsToProcessForGrading.push(item); // Chỉ chấm điểm items có qNum
                            });
                        });
                    } else if (noteSec.items) { // Xử lý nếu notes_sections có items trực tiếp
                        noteSec.items.forEach(item => {
                            if (item.qNum) itemsToProcessForGrading.push(item);
                        });
                    }
                });
            }

            itemsToProcessForGrading.forEach(item => {
                totalQuestions++; // Tăng totalQuestions
                const userAnswer = (userResponses[item.qNum] || '').toLowerCase().trim();
                const correctAnswer = (item.answer || '').toLowerCase().trim();
                const isCorrect = (userAnswer === correctAnswer);
                if (isCorrect) totalCorrect++;

                // Lấy input field
                const textInput = document.querySelector(`input[type="text"][data-qnum="${item.qNum}"]`);
                const listItem = document.getElementById(`q${item.qNum}`); // Lấy li chứa input
                
                if (textInput) {
                    // Áp dụng class đúng/sai trực tiếp cho input
                    textInput.classList.add(isCorrect ? 'correct-selected' : 'incorrect-selected');

                    // Thêm đáp án đúng vào bên cạnh input nếu sai
                    if (!isCorrect && item.answer) {
                        const correctAnswerSpan = document.createElement('span');
                        correctAnswerSpan.classList.add('correct-answer-box');
                        correctAnswerSpan.textContent = `${item.answer}`;
                        if (listItem) {
                             // Tìm vị trí của input trong li để chèn đáp án đúng bên cạnh nó
                            const inputElement = listItem.querySelector(`input[type="text"][data-qnum="${item.qNum}"]`);
                            if (inputElement) {
                                inputElement.insertAdjacentElement('afterend', correctAnswerSpan);
                            }
                        }
                    }
                }
                
                resultsHtml += `
                        <p><strong>Câu ${item.qNum}:</strong><br>
                        Trả lời của bạn: <span style="color: ${isCorrect ? 'green' : 'red'};">${userResponses[item.qNum] || 'Chưa trả lời'}</span><br>
                        Đáp án đúng: <span style="color: green;">${item.answer}</span>
                        </p>
                    `;
            });
        }
    });

    resultsHtml = `<h3>Tổng điểm: ${totalCorrect}/${totalQuestions}</h3>` + resultsHtml;

    let resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'resultsContainer';
        document.body.appendChild(resultsContainer);
    }
    resultsContainer.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto; position: relative;">
            ${resultsHtml}
            <button onclick="document.getElementById('resultsContainer').classList.remove('show');">Đóng</button>
        </div>
    `;
    resultsContainer.classList.add('show');

    // Cập nhật điểm ở header
    document.getElementById('scoreDisplay').textContent = `${totalCorrect}/${totalQuestions}`;
}

document.querySelector('.nav-button:last-of-type').addEventListener('click', checkAndDisplayResults);


// --- Chức năng cài đặt (Font Size) ---
const settingsIcon = document.getElementById('settingsIcon');
const settingsModal = document.getElementById('settingsModal');
const closeButton = settingsModal.querySelector('.close-button');
const fontSizeButtons = document.querySelectorAll('.font-size-btn');
// Lấy thẻ hiển thị điểm trong header
const scoreDisplay = document.getElementById('scoreDisplay');


// Mở modal cài đặt
settingsIcon.addEventListener('click', () => {
    settingsModal.classList.add('show');
    updateFontSizeButtonsActiveState(); // Cập nhật trạng thái nút active khi mở modal
});

// Đóng modal cài đặt
closeButton.addEventListener('click', () => {
    settingsModal.classList.remove('show');
});

// Đóng modal khi click ra ngoài
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
    }
});

// Lưu và áp dụng font size
fontSizeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const size = button.dataset.size;
        localStorage.setItem('ieltsFontSize', size); // Lưu vào localStorage
        applyFontSize(size);
        updateFontSizeButtonsActiveState(); // Cập nhật trạng thái nút active
    });
});

// Áp dụng font size khi tải trang hoặc khi người dùng thay đổi
function applyFontSize(size) {
    // Xóa tất cả các class font size hiện có
    document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');

    // Thêm class font size mới
    if (size === 'small') {
        document.body.classList.add('font-size-small');
    } else if (size === 'medium') {
        document.body.classList.add('font-size-medium');
    } else if (size === 'large') {
        document.body.classList.add('font-size-large');
    } else {
        // Mặc định là medium nếu không có hoặc không hợp lệ
        document.body.classList.add('font-size-medium');
        localStorage.setItem('ieltsFontSize', 'medium'); // Lưu mặc định
    }
}

// Cập nhật trạng thái active của các nút chọn font size trong modal
function updateFontSizeButtonsActiveState() {
    const currentSize = localStorage.getItem('ieltsFontSize') || 'medium'; // Lấy cỡ chữ hiện tại hoặc mặc định
    fontSizeButtons.forEach(btn => {
        if (btn.dataset.size === currentSize) {
            btn.classList.add('active-font-size');
        } else {
            btn.classList.remove('active-font-size');
        }
    });
}

// Áp dụng font size đã lưu khi trang tải
function applySavedFontSize() {
    const savedSize = localStorage.getItem('ieltsFontSize');
    applyFontSize(savedSize);
}


// --- Chức năng Highlight (Tô màu đoạn văn) ---
let currentRange = null; // Lưu trữ Range của vùng văn bản được chọn
let highlightTooltip = null; // Tham chiếu đến tooltip highlight
let selectedHighlightColor = 'yellow'; // Màu highlight mặc định
const readingPassageElement = document.getElementById('readingPassage');

// Khởi tạo tooltip
function initializeHighlightTooltip() {
    highlightTooltip = document.createElement('div');
    highlightTooltip.id = 'highlight-tooltip';
    highlightTooltip.innerHTML = `
        <div class="button-row">
            <button id="highlightBtn">Highlight</button>
            <button id="clearHighlightBtn">Clear</button>
        </div>
        <div id="highlight-color-options">
            <div class="color-box highlight-color-yellow active-color" data-color="yellow"></div>
            <div class="color-box highlight-color-blue" data-color="blue"></div>
            <div class="color-box highlight-color-pink" data-color="pink"></div>
            <div class="color-box highlight-color-green" data-color="green"></div>
        </div>
    `;
    document.body.appendChild(highlightTooltip);

    document.getElementById('highlightBtn').addEventListener('click', applyHighlight);
    document.getElementById('clearHighlightBtn').addEventListener('click', clearHighlight);
    document.getElementById('highlight-color-options').addEventListener('click', (e) => {
        if (e.target.classList.contains('color-box')) {
            document.querySelectorAll('#highlight-color-options .color-box').forEach(box => {
                box.classList.remove('active-color');
            });
            e.target.classList.add('active-color');
            selectedHighlightColor = e.target.dataset.color;
        }
    });
}


document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection();
    // Kiểm tra xem có văn bản nào được chọn và việc chọn nằm trong vùng readingPassageElement
    if (selection.toString().length > 0 && readingPassageElement.contains(selection.anchorNode) && readingPassageElement.contains(selection.focusNode)) {
        currentRange = selection.getRangeAt(0);
        showHighlightTooltip(e.clientX, e.clientY);
    } else {
        // Nếu không có văn bản được chọn hoặc chọn bên ngoài vùng passage, ẩn tooltip
        hideHighlightTooltip();
    }
});

function showHighlightTooltip(x, y) {
    if (!highlightTooltip) initializeHighlightTooltip(); // Khởi tạo nếu chưa có
    
    highlightTooltip.style.display = 'flex'; // Hiển thị tooltip
    
    // Đảm bảo tooltip nằm trong viewport
    const tooltipRect = highlightTooltip.getBoundingClientRect();
    let left = x;
    let top = y;

    // Điều chỉnh vị trí để tooltip không bị tràn màn hình
    // Nếu tooltip bị tràn sang phải
    if (left + tooltipRect.width > window.innerWidth - 10) { // Thêm 10px padding từ rìa
        left = window.innerWidth - tooltipRect.width - 10;
    }
    // Nếu tooltip bị tràn sang trái
    if (left < 10) {
        left = 10;
    }
    // Nếu tooltip bị tràn lên trên
    if (top - tooltipRect.height - 10 < 0) { // Thêm 10px padding từ trên
        top = y + 10; // Hiển thị xuống dưới chuột
    } else {
        top = y - tooltipRect.height - 10; // Mặc định hiển thị lên trên chuột
    }

    highlightTooltip.style.left = `${left}px`;
    highlightTooltip.style.top = `${top}px`;
}

function hideHighlightTooltip() {
    if (highlightTooltip) {
        highlightTooltip.style.display = 'none';
    }
    // Không cần xóa currentRange ở đây, nó sẽ được cập nhật khi có selection mới
}

function applyHighlight() {
    if (!currentRange || currentRange.collapsed) { // Đảm bảo có selection và không phải là điểm chèn
        hideHighlightTooltip();
        return;
    }

    // Tạo một phần tử span mới
    const span = document.createElement('span');
    span.classList.add('user-highlight', `highlight-color-${selectedHighlightColor}`);

    try {
        // Bọc nội dung của range trong span mới
        currentRange.surroundContents(span);
    } catch (e) {
        // Xử lý lỗi nếu surroundContents không thể thực hiện (ví dụ: selection cắt ngang các thẻ HTML)
        console.warn("Could not surround contents directly. Attempting to wrap nodes individually.", e);
        wrapRangeContents(currentRange, span.className);
    }
    
    hideHighlightTooltip();
    saveHighlights(); // Lưu highlights sau khi áp dụng
    clearSelection(); // Xóa selection sau khi highlight
}

// Hàm hỗ trợ để bọc nội dung range một cách an toàn hơn
function wrapRangeContents(range, className) {
    const fragment = range.extractContents();
    const wrapper = document.createElement('span');
    wrapper.className = className;
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
}


function clearHighlight() {
    if (!currentRange || currentRange.collapsed) {
        hideHighlightTooltip();
        return;
    }

    // Lấy tất cả các highlight spans trong vùng chọn
    const highlightedSpans = getHighlightsInRange(currentRange);

    highlightedSpans.forEach(span => {
        // Thay thế span bằng nội dung bên trong của nó
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
    });

    hideHighlightTooltip();
    saveHighlights(); // Lưu highlights sau khi xóa
    clearSelection(); // Xóa selection sau khi clear
}

// Hàm hỗ trợ để lấy tất cả các highlight spans trong một range
function getHighlightsInRange(range) {
    const commonAncestor = range.commonAncestorContainer;
    const highlightSpans = [];

    // Duyệt qua các node trong range
    const treeWalker = document.createTreeWalker(
        commonAncestor,
        NodeFilter.SHOW_ELEMENT,
        { acceptNode: (node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('user-highlight')) {
                // Kiểm tra xem highlight span này có giao với range hay không
                const spanRange = document.createRange();
                spanRange.selectNode(node);
                if (range.intersectsNode(node)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
            return NodeFilter.FILTER_SKIP;
        }},
        false
    );

    let currentNode;
    while ((currentNode = treeWalker.nextNode())) {
        highlightSpans.push(currentNode);
    }
    return highlightSpans;
}

// Xóa selection hiện tại
function clearSelection() {
    if (window.getSelection) {
        if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
        }
    } else if (document.selection) {  // IE
        document.selection.empty();
    }
}


function saveHighlights() {
    if (!readingPassageElement) return;

    // Chỉ lưu nội dung bên trong của readingPassageElement
    const passageHtml = readingPassageElement.innerHTML;
    localStorage.setItem('ieltsHighlights', passageHtml);
}

function loadHighlights() {
    if (!readingPassageElement) return;

    const savedHighlights = localStorage.getItem('ieltsHighlights');
    if (savedHighlights) {
        readingPassageElement.innerHTML = savedHighlights;
    }
}


// --- Khởi tạo khi trang tải xong ---
document.addEventListener('DOMContentLoaded', () => {
    loadExamContent(); // Hàm này giờ sẽ gọi cả loadUserResponses và applySavedFontSize
    loadHighlights(); // Tải highlights đã lưu
    initializeHighlightTooltip(); // Khởi tạo tooltip highlight
    
    // Cập nhật scoreDisplay ban đầu (có thể là 0/Total hoặc score đã lưu nếu có)
    document.getElementById('scoreDisplay').textContent = `0/${totalQuestionsCount}`;
});