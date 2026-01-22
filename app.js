// ===== State =====
const state = {
    assignments: {}, // { "東": { type: "member", value: "父親" }, ... }
    selectedCell: null
};

// ===== Data =====
const options = {
    member: [
        { value: "父親", icon: "👴" },
        { value: "母親", icon: "👵" },
        { value: "長子", icon: "👦" },
        { value: "長女", icon: "👧" },
        { value: "次子", icon: "👦" },
        { value: "次女", icon: "👧" },
        { value: "幼子", icon: "👶" },
        { value: "幼女", icon: "👶" }
    ],
    room: [
        { value: "廚房", icon: "🍳" },
        { value: "廁所", icon: "🚽" },
        { value: "客廳", icon: "🛋️" },
        { value: "主臥", icon: "🛏️" }
    ],
    office: [
        { value: "老闆(男)", icon: "👔" },
        { value: "老闆(女)", icon: "👩‍💼" }
    ],
    clear: [
        { value: "清除", icon: "❌" }
    ]
};

// ===== DOM Elements =====
const gridCells = document.querySelectorAll('.grid-cell');
const modal = document.getElementById('selectionModal');
const modalDirection = document.getElementById('modalDirection');
const modalOptions = document.getElementById('modalOptions');
const modalClose = document.getElementById('modalClose');
const generateBtn = document.getElementById('generatePrompt');
const promptOutput = document.getElementById('promptOutput');
const copyBtn = document.getElementById('copyPrompt');
const clearAllBtn = document.getElementById('clearAll');

// ===== Event Listeners =====

// Grid cell click
gridCells.forEach(cell => {
    cell.addEventListener('click', () => {
        const direction = cell.dataset.direction;
        state.selectedCell = cell;
        openModal(direction);
    });
});

// Modal close
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Generate prompt
generateBtn.addEventListener('click', generatePrompt);

// Copy prompt
copyBtn.addEventListener('click', copyPromptToClipboard);

// Clear all
clearAllBtn.addEventListener('click', clearAll);

// ===== Functions =====

function openModal(direction) {
    modalDirection.textContent = direction;
    modalOptions.innerHTML = '';

    // Add all options
    const allOptions = [...options.member, ...options.room, ...options.office, ...options.clear];

    allOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = `${opt.icon} ${opt.value}`;
        btn.addEventListener('click', () => {
            if (opt.value === '清除') {
                removeAssignment(direction);
            } else {
                const type = options.member.find(o => o.value === opt.value) ? 'member' :
                    options.room.find(o => o.value === opt.value) ? 'room' : 'office';
                setAssignment(direction, type, opt.value, opt.icon);
            }
            closeModal();
        });
        modalOptions.appendChild(btn);
    });

    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
    state.selectedCell = null;
}

function setAssignment(direction, type, value, icon) {
    // Remove previous assignment of this value (one person can only be in one place)
    if (type === 'member' || type === 'office') {
        Object.keys(state.assignments).forEach(dir => {
            if (state.assignments[dir]?.value === value) {
                delete state.assignments[dir];
                updateCellDisplay(dir);
            }
        });
    }

    state.assignments[direction] = { type, value, icon };
    updateCellDisplay(direction);
}

function removeAssignment(direction) {
    delete state.assignments[direction];
    updateCellDisplay(direction);
}

function updateCellDisplay(direction) {
    const cell = document.querySelector(`[data-direction="${direction}"]`);
    const assignment = state.assignments[direction];
    const assignmentDiv = cell.querySelector('.assignment');

    if (assignment) {
        assignmentDiv.textContent = `${assignment.icon} ${assignment.value}`;
        cell.classList.add('active');
    } else {
        assignmentDiv.textContent = '';
        cell.classList.remove('active');
    }
}

function clearAll() {
    state.assignments = {};
    gridCells.forEach(cell => {
        cell.querySelector('.assignment').textContent = '';
        cell.classList.remove('active');
    });
    promptOutput.innerHTML = '<p class="placeholder">點擊上方按鈕生成 Prompt...</p>';
    copyBtn.style.display = 'none';
}

function generatePrompt() {
    const family = {};
    const rooms = {};
    let isOffice = false;

    Object.entries(state.assignments).forEach(([direction, assignment]) => {
        if (assignment.type === 'member') {
            family[assignment.value] = direction;
        } else if (assignment.type === 'room') {
            rooms[assignment.value] = direction;
        } else if (assignment.type === 'office') {
            family[assignment.value] = direction;
            isOffice = true;
        }
    });

    if (Object.keys(family).length === 0 && Object.keys(rooms).length === 0) {
        promptOutput.innerHTML = '<p class="placeholder" style="color: #f87171;">請先在九宮格中設定至少一位成員或房間的位置</p>';
        return;
    }

    // Generate prompt
    let prompt = `請幫我分析${isOffice ? '辦公室' : '住宅'}風水：\n\n`;

    if (Object.keys(family).length > 0) {
        prompt += `【${isOffice ? '座位' : '臥室'}配置】\n`;
        Object.entries(family).forEach(([member, direction]) => {
            prompt += `- ${member}：${direction}\n`;
        });
        prompt += '\n';
    }

    if (Object.keys(rooms).length > 0) {
        prompt += `【房間位置】\n`;
        Object.entries(rooms).forEach(([room, direction]) => {
            prompt += `- ${room}：${direction}\n`;
        });
        prompt += '\n';
    }

    prompt += `請根據易經陽宅風水理論，分析：
1. 各成員的卦象與吉凶
2. 房間位置的風水影響
3. 改善建議

（使用 yijing-fengshui Skill 進行分析）`;

    promptOutput.textContent = prompt;
    copyBtn.style.display = 'inline-block';
}

function copyPromptToClipboard() {
    const text = promptOutput.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ 已複製！';
        copyBtn.style.background = 'var(--success)';
        copyBtn.style.color = 'var(--bg-dark)';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = 'transparent';
            copyBtn.style.color = 'var(--success)';
        }, 2000);
    });
}
