// ===== Config =====
const ROOM_MIN_SIZE = 60;
const ROOM_DEFAULT_SIZE = 100;
const PERSON_SIZE = 32;
const HANDLE_SIZE = 10;

const COLORS = {
    room: { fill: 'rgba(159, 74, 223, 0.3)', stroke: '#9f4adf' },
    facility: { fill: 'rgba(223, 159, 74, 0.3)', stroke: '#df9f4a' },
    bedroom: { fill: 'rgba(74, 159, 223, 0.2)', stroke: '#4a9fdf' }
};

// ===== State =====
let rooms = [];
let persons = [];
let selectedRoom = null;
let selectedPerson = null;
let dragMode = null; // 'move', 'resize', 'rotate', 'move-person'
let dragStart = { x: 0, y: 0 };
let originalState = null;
let compassRotation = 0; // in degrees, 0 = north up

// ===== Canvas Setup =====
const canvas = document.getElementById('floorCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    draw();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== Utility =====
function isBedroom(value) {
    return value.includes('臥室') || value === '主臥室';
}

function getDirection(x, y, w, h) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const objCenterX = x + w / 2;
    const objCenterY = y + h / 2;

    const dx = objCenterX - centerX;
    const dy = objCenterY - centerY;

    const threshold = 50;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return '中央';

    // Calculate angle and adjust for compass rotation
    let angle = Math.atan2(-dy, dx) * 180 / Math.PI;
    angle = angle - compassRotation; // Adjust for compass rotation

    // Normalize angle to -180 to 180
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;

    if (angle >= -22.5 && angle < 22.5) return '東';
    if (angle >= 22.5 && angle < 67.5) return '東北';
    if (angle >= 67.5 && angle < 112.5) return '北';
    if (angle >= 112.5 && angle < 157.5) return '西北';
    if (angle >= 157.5 || angle < -157.5) return '西';
    if (angle >= -157.5 && angle < -112.5) return '西南';
    if (angle >= -112.5 && angle < -67.5) return '南';
    if (angle >= -67.5 && angle < -22.5) return '東南';

    return '中央';
}

function isInsideRoom(px, py, room) {
    // Simple rectangle check (ignoring rotation for now)
    return px >= room.x && px <= room.x + room.w &&
        py >= room.y && py <= room.y + room.h;
}

function findBedroomAt(x, y) {
    for (let i = rooms.length - 1; i >= 0; i--) {
        if (isBedroom(rooms[i].value) && isInsideRoom(x, y, rooms[i])) {
            return rooms[i];
        }
    }
    return null;
}

// ===== Drawing =====
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center crosshair
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw rooms
    rooms.forEach((room, idx) => {
        ctx.save();

        const cx = room.x + room.w / 2;
        const cy = room.y + room.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(room.rotation || 0);
        ctx.translate(-cx, -cy);

        const colors = isBedroom(room.value) ? COLORS.bedroom :
            (room.type === 'room' ? COLORS.room : COLORS.facility);

        // Fill
        ctx.fillStyle = colors.fill;
        ctx.fillRect(room.x, room.y, room.w, room.h);

        // Border
        ctx.strokeStyle = selectedRoom === idx ? '#fff' : colors.stroke;
        ctx.lineWidth = selectedRoom === idx ? 3 : 2;
        ctx.strokeRect(room.x, room.y, room.w, room.h);

        // Icon & Label
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(room.icon, cx, cy - 5);

        ctx.font = 'bold 11px Arial';
        ctx.fillText(room.value, cx, cy + 15);

        // Direction
        const dir = getDirection(room.x, room.y, room.w, room.h);
        ctx.fillStyle = 'rgba(201, 162, 39, 0.9)';
        ctx.font = '9px Arial';
        ctx.fillText(dir, cx, room.y + room.h - 5);

        ctx.restore();

        // Resize handle (when selected)
        if (selectedRoom === idx) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(room.x + room.w - HANDLE_SIZE, room.y + room.h - HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE);

            // Rotate handle
            ctx.beginPath();
            ctx.arc(room.x + room.w / 2, room.y - 15, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#c9a227';
            ctx.fill();
        }
    });

    // Draw persons (positioned relative to their bedroom)
    persons.forEach((person, idx) => {
        const bedroom = rooms[person.bedroomId];
        if (!bedroom) return;

        // Calculate position from bedroom center + offset
        const px = bedroom.x + bedroom.w / 2 + (person.offsetX || 0);
        const py = bedroom.y + bedroom.h / 2 + (person.offsetY || 0);

        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(person.icon, px, py);

        ctx.font = 'bold 9px Arial';
        ctx.fillStyle = selectedPerson === idx ? '#fff' : '#4a9fdf';
        ctx.fillText(person.value, px, py + 16);
    });
}

// ===== Toolbox: Drag & Click =====
function addItemToCanvas(type, value, icon, targetX, targetY) {
    if (type === 'person') {
        // Check if dropped on a bedroom
        const bedroom = findBedroomAt(targetX, targetY);
        if (bedroom) {
            const bedroomIdx = rooms.indexOf(bedroom);
            // Remove existing person with same value
            persons = persons.filter(p => p.value !== value);
            // Store as offset from bedroom center (fixed position)
            const personsInRoom = persons.filter(p => p.bedroomId === bedroomIdx).length;
            const offsetX = (personsInRoom % 2) * 30 - 15;
            const offsetY = Math.floor(personsInRoom / 2) * 25;
            persons.push({
                value,
                icon,
                bedroomId: bedroomIdx,
                offsetX: offsetX,
                offsetY: offsetY
            });
        } else {
            showToast('⚠️ 家人只能放入臥室！');
            return false;
        }
    } else {
        // Room or facility - random position if no target
        const x = targetX || (100 + Math.random() * (canvas.width - 300));
        const y = targetY || (100 + Math.random() * (canvas.height - 300));
        rooms.push({
            type,
            value,
            icon,
            x: x - ROOM_DEFAULT_SIZE / 2,
            y: y - ROOM_DEFAULT_SIZE / 2,
            w: ROOM_DEFAULT_SIZE,
            h: ROOM_DEFAULT_SIZE,
            rotation: 0
        });
    }
    return true;
}

let isDraggingFromToolbox = false;

document.querySelectorAll('.tool-item').forEach(item => {
    // Drag start
    item.addEventListener('dragstart', (e) => {
        isDraggingFromToolbox = true;
        e.dataTransfer.setData('type', item.dataset.type);
        e.dataTransfer.setData('value', item.dataset.value);
        e.dataTransfer.setData('icon', item.dataset.icon);
    });

    item.addEventListener('dragend', () => {
        // Reset after a short delay to allow drop to complete
        setTimeout(() => { isDraggingFromToolbox = false; }, 100);
    });

    // Click to spawn (only if not dragging)
    item.addEventListener('click', (e) => {
        // Skip if this was a drag action
        if (isDraggingFromToolbox) {
            isDraggingFromToolbox = false;
            return;
        }

        const type = item.dataset.type;
        const value = item.dataset.value;
        const icon = item.dataset.icon;

        if (type === 'person') {
            // Person needs a bedroom first
            const bedrooms = rooms.filter(r => isBedroom(r.value));
            if (bedrooms.length === 0) {
                showToast('請先放置臥室！');
                return;
            }
            // Find a bedroom without this person
            let targetBedroom = bedrooms.find(b => {
                const idx = rooms.indexOf(b);
                return !persons.some(p => p.bedroomId === idx && p.value === value);
            });
            if (!targetBedroom) targetBedroom = bedrooms[0];
            const cx = targetBedroom.x + targetBedroom.w / 2;
            const cy = targetBedroom.y + targetBedroom.h / 2;
            addItemToCanvas(type, value, icon, cx, cy);
        } else {
            // Random position for rooms/facilities
            addItemToCanvas(type, value, icon, null, null);
        }
        draw();
        updateConfigList();
    });
});

canvas.addEventListener('dragover', (e) => e.preventDefault());

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const type = e.dataTransfer.getData('type');
    const value = e.dataTransfer.getData('value');
    const icon = e.dataTransfer.getData('icon');

    addItemToCanvas(type, value, icon, x, y);
    draw();
    updateConfigList();
});

// ===== Canvas Mouse Events =====
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check persons first (calculate their actual position)
    for (let i = persons.length - 1; i >= 0; i--) {
        const p = persons[i];
        const bedroom = rooms[p.bedroomId];
        if (!bedroom) continue;
        const px = bedroom.x + bedroom.w / 2 + (p.offsetX || 0);
        const py = bedroom.y + bedroom.h / 2 + (p.offsetY || 0);
        if (Math.abs(mx - px) < PERSON_SIZE / 2 && Math.abs(my - py) < PERSON_SIZE / 2) {
            selectedPerson = i;
            selectedRoom = null;
            dragMode = 'move-person';
            dragStart = { x: mx, y: my };
            originalState = { bedroomId: p.bedroomId, offsetX: p.offsetX, offsetY: p.offsetY };
            draw();
            return;
        }
    }

    // Check rooms
    for (let i = rooms.length - 1; i >= 0; i--) {
        const r = rooms[i];

        // Resize handle
        if (selectedRoom === i) {
            if (mx >= r.x + r.w - HANDLE_SIZE && mx <= r.x + r.w &&
                my >= r.y + r.h - HANDLE_SIZE && my <= r.y + r.h) {
                dragMode = 'resize';
                dragStart = { x: mx, y: my };
                originalState = { w: r.w, h: r.h };
                return;
            }

            // Rotate handle
            const rotateX = r.x + r.w / 2;
            const rotateY = r.y - 15;
            if (Math.sqrt((mx - rotateX) ** 2 + (my - rotateY) ** 2) < 10) {
                dragMode = 'rotate';
                dragStart = { x: mx, y: my };
                originalState = { rotation: r.rotation || 0 };
                return;
            }
        }

        // Room body
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            selectedRoom = i;
            selectedPerson = null;
            dragMode = 'move-room';
            dragStart = { x: mx - r.x, y: my - r.y };
            draw();
            return;
        }
    }

    selectedRoom = null;
    selectedPerson = null;
    draw();
});

canvas.addEventListener('mousemove', (e) => {
    if (!dragMode) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragMode === 'move-room' && selectedRoom !== null) {
        rooms[selectedRoom].x = mx - dragStart.x;
        rooms[selectedRoom].y = my - dragStart.y;
    } else if (dragMode === 'resize' && selectedRoom !== null) {
        const dx = mx - dragStart.x;
        const dy = my - dragStart.y;
        rooms[selectedRoom].w = Math.max(ROOM_MIN_SIZE, originalState.w + dx);
        rooms[selectedRoom].h = Math.max(ROOM_MIN_SIZE, originalState.h + dy);
    } else if (dragMode === 'rotate' && selectedRoom !== null) {
        const r = rooms[selectedRoom];
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const angle = Math.atan2(my - cy, mx - cx);
        rooms[selectedRoom].rotation = angle + Math.PI / 2;
    } else if (dragMode === 'move-person' && selectedPerson !== null) {
        // Update offset relative to current bedroom
        const p = persons[selectedPerson];
        const bedroom = rooms[p.bedroomId];
        if (bedroom) {
            p.offsetX = mx - (bedroom.x + bedroom.w / 2);
            p.offsetY = my - (bedroom.y + bedroom.h / 2);
        }
    }

    draw();
    updateConfigList();
});

canvas.addEventListener('mouseup', (e) => {
    if (dragMode === 'move-person' && selectedPerson !== null) {
        const p = persons[selectedPerson];
        const bedroom = rooms[p.bedroomId];
        if (bedroom) {
            const px = bedroom.x + bedroom.w / 2 + (p.offsetX || 0);
            const py = bedroom.y + bedroom.h / 2 + (p.offsetY || 0);
            const newBedroom = findBedroomAt(px, py);

            if (!newBedroom) {
                // Bounce back to original position
                p.bedroomId = originalState.bedroomId;
                p.offsetX = originalState.offsetX;
                p.offsetY = originalState.offsetY;
                showToast('⚠️ 家人必須在臥室內！');
            } else if (newBedroom !== bedroom) {
                // Moved to a different bedroom
                p.bedroomId = rooms.indexOf(newBedroom);
                p.offsetX = px - (newBedroom.x + newBedroom.w / 2);
                p.offsetY = py - (newBedroom.y + newBedroom.h / 2);
            }
        }
        draw();
        updateConfigList();
    }

    dragMode = null;
    originalState = null;
});

canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check persons (calculate actual position)
    for (let i = persons.length - 1; i >= 0; i--) {
        const p = persons[i];
        const bedroom = rooms[p.bedroomId];
        if (!bedroom) continue;
        const px = bedroom.x + bedroom.w / 2 + (p.offsetX || 0);
        const py = bedroom.y + bedroom.h / 2 + (p.offsetY || 0);
        if (Math.abs(mx - px) < PERSON_SIZE / 2 && Math.abs(my - py) < PERSON_SIZE / 2) {
            persons.splice(i, 1);
            selectedPerson = null;
            draw();
            updateConfigList();
            return;
        }
    }

    // Check rooms
    for (let i = rooms.length - 1; i >= 0; i--) {
        const r = rooms[i];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            // Remove persons in this room too
            persons = persons.filter(p => p.bedroomId !== i);
            rooms.splice(i, 1);
            selectedRoom = null;
            draw();
            updateConfigList();
            return;
        }
    }
});

// ===== Toast =====
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.className = 'toast-msg';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1b2838;
        color: #fbbf24;
        padding: 10px 20px;
        border-radius: 8px;
        border: 1px solid #fbbf24;
        z-index: 9999;
        animation: fadeOut 2s forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ===== Config List =====
function updateConfigList() {
    const list = document.getElementById('configList');

    if (rooms.length === 0 && persons.length === 0) {
        list.innerHTML = `<p style="color: var(--text-muted); font-size: 0.75rem;">
            1. 先拖拉房間到平面圖<br>
            2. 再將家人放入臥室
        </p>`;
        return;
    }

    let html = '';

    rooms.forEach(r => {
        const dir = getDirection(r.x, r.y, r.w, r.h);
        html += `<div class="config-item">
            <span>${r.icon} ${r.value}</span>
            <span class="dir">${dir}</span>
        </div>`;
    });

    persons.forEach(p => {
        const bedroom = rooms[p.bedroomId];
        const dir = bedroom ? getDirection(bedroom.x, bedroom.y, bedroom.w, bedroom.h) : '?';
        html += `<div class="config-item" style="border-left: 2px solid #4a9fdf;">
            <span>${p.icon} ${p.value}</span>
            <span class="dir">${dir}</span>
        </div>`;
    });

    list.innerHTML = html;
}

// ===== Clear =====
document.getElementById('clearCanvas').addEventListener('click', () => {
    rooms = [];
    persons = [];
    selectedRoom = null;
    selectedPerson = null;
    draw();
    updateConfigList();
    document.getElementById('promptOutput').classList.remove('show');
    document.getElementById('copyBtn').classList.remove('show');
});

// ===== Generate Prompt =====
document.getElementById('generateBtn').addEventListener('click', () => {
    if (rooms.length === 0) {
        showToast('請先放置至少一個房間');
        return;
    }

    const family = [];
    const roomsData = [];

    // Collect Family Data
    persons.forEach(p => {
        const bedroom = rooms[p.bedroomId];
        if (bedroom) {
            const dir = getDirection(bedroom.x, bedroom.y, bedroom.w, bedroom.h);
            family.push({ member: p.value, dir: dir });
        }
    });

    // Collect Rooms Data
    rooms.forEach(r => {
        if (!isBedroom(r.value)) {
            const dir = getDirection(r.x, r.y, r.w, r.h);
            roomsData.push({ room: r.value, dir: dir });
        }
    });

    let prompt = `請幫我分析住宅風水：\n\n`;

    if (family.length > 0) {
        prompt += `【家庭成員臥室位置】\n`;
        family.forEach(item => {
            prompt += `- ${item.member}：${item.dir}\n`;
        });
        prompt += '\n';
    }

    if (roomsData.length > 0) {
        prompt += `【房間/設施位置】\n`;
        roomsData.forEach(item => {
            prompt += `- ${item.room}：${item.dir}\n`;
        });
        prompt += '\n';
    }

    prompt += `請根據易經陽宅風水理論分析：
1. 各成員的卦象與吉凶
2. 房間位置的風水影響
3. 改善建議

（使用 yijing-fengshui Skill）`;

    const output = document.getElementById('promptOutput');
    const copyBtn = document.getElementById('copyBtn');
    output.textContent = prompt;
    output.classList.add('show');
    copyBtn.classList.add('show');
});

// ===== Copy =====
document.getElementById('copyBtn').addEventListener('click', () => {
    const text = document.getElementById('promptOutput').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = '✅ 已複製！';
        btn.style.background = 'var(--success)';
        btn.style.color = 'var(--bg-dark)';
        setTimeout(() => {
            btn.textContent = '📋 複製 Prompt';
            btn.style.background = 'transparent';
            btn.style.color = 'var(--success)';
        }, 2000);
    });
});

// ===== Compass Rotation =====
const compass = document.getElementById('compass');
const compassInner = document.getElementById('compassInner');
let isRotatingCompass = false;
let compassStartAngle = 0;

compass.addEventListener('mousedown', (e) => {
    isRotatingCompass = true;
    const rect = compass.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    compassStartAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI - compassRotation;
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isRotatingCompass) return;
    const rect = compass.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    compassRotation = currentAngle - compassStartAngle;

    // Update visual rotation
    compassInner.style.transform = `rotate(${compassRotation}deg)`;

    // Redraw to update directions
    draw();
    updateConfigList();
});

document.addEventListener('mouseup', () => {
    isRotatingCompass = false;
});
