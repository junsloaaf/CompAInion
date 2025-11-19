// Global variables
let currentMaterial = '';
let aiSummary = '';
let quizQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let timer;
let timeLeft = 20;
let userAnswers = [];

// API Configuration
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your actual API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

// Tab switching function
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Activate selected button
    event.target.classList.add('active');
}

// File upload handling
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
});

// Handle file upload and reading
function handleFileUpload(file) {
    const fileName = file.name.toLowerCase();
    
    if (!fileName.match(/\.(txt|pdf|doc|docx)$/)) {
        alert('Format file tidak didukung. Silakan upload file TXT, PDF, DOC, atau DOCX.');
        return;
    }
    
    if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentMaterial = e.target.result;
            document.getElementById('material-input').value = currentMaterial;
            switchTab('text');
        };
        reader.readAsText(file);
    } else {
        alert('Untuk file PDF, DOC, atau DOCX, sistem akan membaca teks yang bisa diekstrak. Fitur ini membutuhkan backend processing.');
        // In a real implementation, you'd send to a backend service for text extraction
    }
}

// Generate summary using Gemini AI
async function generateSummary() {
    const materialInput = document.getElementById('material-input').value.trim();
    const generateBtn = document.getElementById('generate-btn');
    const btnText = generateBtn.querySelector('.btn-text');
    const spinner = generateBtn.querySelector('.loading-spinner');
    
    if (materialInput.length < 100) {
        alert('Masukkan minimal 100 karakter materi untuk dibuat rangkuman.');
        return;
    }
    
    currentMaterial = materialInput;
    
    // Show loading state
    generateBtn.disabled = true;
    btnText.textContent = 'Membuat Rangkuman...';
    spinner.style.display = 'block';
    
    try {
        // Prepare prompt for Gemini
        const prompt = `Buatlah rangkuman yang jelas dan mudah dipahami dari materi berikut ini. Gunakan bahasa Indonesia yang baik dan struktur yang terorganisir:\n\n${currentMaterial}`;
        
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        aiSummary = data.candidates[0].content.parts[0].text;
        
        // Display results
        document.getElementById('original-material').textContent = currentMaterial;
        document.getElementById('ai-summary').textContent = aiSummary;
        document.getElementById('results-section').style.display = 'block';
        
        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error generating summary:', error);
        alert('Terjadi kesalahan saat membuat rangkuman. Silakan coba lagi.');
        
        // Fallback: create a simple summary (for demo purposes)
        aiSummary = `Rangkuman Materi:\n\n${currentMaterial.substring(0, 300)}...\n\n[Catatan: Ini adalah rangkuman sederhana karena API tidak tersedia]`;
        document.getElementById('original-material').textContent = currentMaterial;
        document.getElementById('ai-summary').textContent = aiSummary;
        document.getElementById('results-section').style.display = 'block';
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        btnText.textContent = '✨ Buat Rangkuman';
        spinner.style.display = 'none';
    }
}

// Copy functions
function copyOriginalMaterial() {
    copyToClipboard(currentMaterial);
    showCopyFeedback('Materi asli berhasil disalin!');
}

function copySummary() {
    copyToClipboard(aiSummary);
    showCopyFeedback('Rangkuman berhasil disalin!');
}

function copyQuiz() {
    const quizContent = generateQuizContentForCopy();
    copyToClipboard(quizContent);
    showCopyFeedback('Kuis berhasil disalin!');
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function showCopyFeedback(message) {
    // Create temporary feedback
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        document.body.removeChild(feedback);
    }, 2000);
}

// Start quiz
async function startQuiz() {
    if (!aiSummary) {
        alert('Silakan buat rangkuman terlebih dahulu sebelum memulai kuis.');
        return;
    }
    
    try {
        // Generate quiz questions using Gemini
        await generateQuizQuestions();
        
        // Hide results section and show quiz section
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('quiz-section').style.display = 'block';
        
        // Start the first question
        currentQuestionIndex = 0;
        userScore = 0;
        userAnswers = [];
        showQuestion();
        
    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Terjadi kesalahan saat membuat kuis. Silakan coba lagi.');
        
        // Fallback: use demo questions
        useDemoQuestions();
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('quiz-section').style.display = 'block';
        currentQuestionIndex = 0;
        userScore = 0;
        userAnswers = [];
        showQuestion();
    }
}

// Generate quiz questions using Gemini AI
async function generateQuizQuestions() {
    const prompt = `Buat 5 soal pilihan ganda berdasarkan teks berikut. Setiap soal harus memiliki 4 pilihan jawaban (A, B, C, D) dan satu jawaban benar. Format output harus JSON array:\n\n[{"question": "pertanyaan", "options": ["A. pilihan A", "B. pilihan B", "C. pilihan C", "D. pilihan D"], "correctAnswer": "A"}]\n\nTeks:\n${aiSummary}`;
    
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const quizText = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON from the response
    try {
        // Extract JSON from the response (Gemini might add some text around the JSON)
        const jsonMatch = quizText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            quizQuestions = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('No JSON found in response');
        }
    } catch (parseError) {
        console.error('Error parsing quiz questions:', parseError);
        useDemoQuestions();
    }
}

// Demo questions fallback
function useDemoQuestions() {
    quizQuestions = [
        {
            question: "Apa tujuan utama dari materi yang telah dipelajari?",
            options: [
                "A. Memahami konsep dasar",
                "B. Menghafal semua detail",
                "C. Mengerjakan soal ujian",
                "D. Menyelesaikan proyek"
            ],
            correctAnswer: "A"
        },
        {
            question: "Manakah yang merupakan poin penting dari rangkuman?",
            options: [
                "A. Semua informasi sama pentingnya",
                "B. Hanya fakta dan angka yang penting",
                "C. Konsep utama dan hubungan antar ide",
                "D. Contoh-contoh spesifik saja"
            ],
            correctAnswer: "C"
        },
        {
            question: "Bagaimana sebaiknya materi ini dipelajari lebih lanjut?",
            options: [
                "A. Menghafal seluruh isi materi",
                "B. Memahami konsep dan berlatih penerapan",
                "C. Membaca sekali saja",
                "D. Mencari materi yang lebih sulit"
            ],
            correctAnswer: "B"
        },
        {
            question: "Apa manfaat dari membuat rangkuman?",
            options: [
                "A. Menghemat waktu belajar",
                "B. Memahami konsep secara menyeluruh",
                "C. Mempermudah review materi",
                "D. Semua jawaban benar"
            ],
            correctAnswer: "D"
        },
        {
            question: "Kapan waktu terbaik untuk mereview materi?",
            options: [
                "A. Hanya sebelum ujian",
                "B. Setelah lupa semua materi",
                "C. Secara berkala dan bertahap",
                "D. Ketika ada waktu luang saja"
            ],
            correctAnswer: "C"
        }
    ];
}

// Show current question
function showQuestion() {
    if (currentQuestionIndex >= quizQuestions.length) {
        showResults();
        return;
    }
    
    const question = quizQuestions[currentQuestionIndex];
    const questionCounter = document.getElementById('question-counter');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const nextBtn = document.getElementById('next-btn');
    
    // Update question counter
    questionCounter.textContent = `Soal ${currentQuestionIndex + 1}/${quizQuestions.length}`;
    
    // Set question text
    questionText.textContent = question.question;
    
    // Clear previous options
    optionsContainer.innerHTML = '';
    
    // Create option buttons
    question.options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.className = 'option-btn';
        optionBtn.textContent = option;
        optionBtn.onclick = () => selectOption(optionBtn, option);
        optionsContainer.appendChild(optionBtn);
    });
    
    // Hide next button initially
    nextBtn.style.display = 'none';
    
    // Start timer
    startTimer();
}

// Start timer for current question
function startTimer() {
    timeLeft = 20;
    updateTimerDisplay();
    
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            handleTimeUp();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    const timerText = timerElement.querySelector('.timer-text');
    timerText.textContent = `⏱️ ${timeLeft}s`;
    
    // Change color when time is running out
    if (timeLeft <= 5) {
        timerElement.style.background = '#ef4444';
    } else if (timeLeft <= 10) {
        timerElement.style.background = '#f59e0b';
    } else {
        timerElement.style.background = '#4f46e5';
    }
}

// Handle time up
function handleTimeUp() {
    const options = document.querySelectorAll('.option-btn');
    const question = quizQuestions[currentQuestionIndex];
    
    // Mark correct answer
    options.forEach(btn => {
        if (btn.textContent.startsWith(question.correctAnswer)) {
            btn.classList.add('correct');
        }
    });
    
    // Record that user didn't answer
    userAnswers.push({
        question: question.question,
        userAnswer: 'Tidak dijawab',
        correctAnswer: question.correctAnswer,
        isCorrect: false
    });
    
    // Show next button
    document.getElementById('next-btn').style.display = 'block';
}

// Select option
function selectOption(selectedBtn, selectedOption) {
    // Clear any existing selections
    const allOptions = document.querySelectorAll('.option-btn');
    allOptions.forEach(btn => {
        btn.classList.remove('selected');
        btn.onclick = null; // Disable further clicks
    });
    
    // Mark selected option
    selectedBtn.classList.add('selected');
    
    // Stop timer
    clearInterval(timer);
    
    const question = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedOption.startsWith(question.correctAnswer);
    
    // Mark correct/incorrect
    allOptions.forEach(btn => {
        if (btn.textContent.startsWith(question.correctAnswer)) {
            btn.classList.add('correct');
        } else if (btn === selectedBtn && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });
    
    // Update score
    if (isCorrect) {
        userScore++;
    }
    
    // Record user answer
    userAnswers.push({
        question: question.question,
        userAnswer: selectedOption,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect
    });
    
    // Show next button
    document.getElementById('next-btn').style.display = 'block';
}

// Next question
function nextQuestion() {
    currentQuestionIndex++;
    showQuestion();
}

// Show final results
function showResults() {
    document.getElementById('quiz-section').style.display = 'none';
    document.getElementById('final-results').style.display = 'block';
    
    const scorePercent = Math.round((userScore / quizQuestions.length) * 100);
    const scorePercentElement = document.getElementById('score-percent');
    const scoreDescriptionElement = document.getElementById('score-description');
    const scoreCircle = document.querySelector('.score-circle');
    
    // Update score display with animation
    let currentPercent = 0;
    const interval = setInterval(() => {
        if (currentPercent >= scorePercent) {
            clearInterval(interval);
            scorePercentElement.textContent = `${scorePercent}%`;
        } else {
            currentPercent++;
            scorePercentElement.textContent = `${currentPercent}%`;
        }
    }, 20);
    
    // Update circle progress
    scoreCircle.style.background = `conic-gradient(#10b981 ${scorePercent}%, #e5e7eb ${scorePercent}%)`;
    
    // Set description based on score
    let description = '';
    if (scorePercent >= 90) {
        description = 'Luar biasa! Penguasaan materi Anda sangat baik.';
    } else if (scorePercent >= 70) {
        description = 'Bagus! Pemahaman materi Anda sudah baik.';
    } else if (scorePercent >= 50) {
        description = 'Cukup baik. Disarankan untuk mereview materi sekali lagi.';
    } else {
        description = 'Perlu belajar lebih giat lagi. Jangan menyerah!';
    }
    scoreDescriptionElement.textContent = description;
    
    // Generate quiz content for copying
    generateQuizContentForDisplay();
}

// Generate quiz content for copying
function generateQuizContentForCopy() {
    let content = `KUIS HASIL BELAJAR\n`;
    content += `Skor: ${userScore}/${quizQuestions.length} (${Math.round((userScore / quizQuestions.length) * 100)}%)\n\n`;
    
    userAnswers.forEach((answer, index) => {
        content += `Soal ${index + 1}: ${answer.question}\n`;
        content += `Jawaban Anda: ${answer.userAnswer}\n`;
        content += `Jawaban Benar: ${answer.correctAnswer}\n`;
        content += `Status: ${answer.isCorrect ? 'Benar' : 'Salah'}\n\n`;
    });
    
    content += `\n---\nDibuat dengan EduAI - Platform Belajar Pintar`;
    return content;
}

// Generate quiz content for display
function generateQuizContentForDisplay() {
    const copyQuizContent = document.getElementById('copy-quiz-content');
    let content = '';
    
    userAnswers.forEach((answer, index) => {
        content += `<div class="quiz-result-item">
            <strong>Soal ${index + 1}:</strong> ${answer.question}<br>
            <strong>Jawaban Anda:</strong> ${answer.userAnswer}<br>
            <strong>Jawaban Benar:</strong> ${answer.correctAnswer}<br>
            <strong>Status:</strong> <span style="color: ${answer.isCorrect ? '#10b981' : '#ef4444'}">${answer.isCorrect ? 'Benar' : 'Salah'}</span>
        </div>`;
        if (index < userAnswers.length - 1) {
            content += '<hr style="margin: 10px 0; border: none; border-top: 1px solid #e5e7eb;">';
        }
    });
    
    copyQuizContent.innerHTML = content;
}

// Navigation functions
function backToSummary() {
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

function backToHome() {
    document.getElementById('final-results').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('quiz-section').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}