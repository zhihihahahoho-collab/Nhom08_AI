const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');

// Load Icons
const personImg = new Image();
personImg.src = 'https://cdn-icons-png.flaticon.com/512/126/126486.png';
const homeImg = new Image();
homeImg.src = 'https://cdn-icons-png.flaticon.com/512/619/619153.png';

// Đồng bộ key với thẻ select trong HTML
let currentMapKey = document.getElementById('mapSelect').value || 'easy';

/**
 * Hàm vẽ đồ thị chính
 */
function drawGraph(currentPath = [], currentNodeId = null, deadEnds = new Set()) {
    if (typeof MAPS === 'undefined') return;

    // Lấy giá trị trực tiếp từ ô nhập liệu để cập nhật giao diện ngay lập tức
    const startInput = parseInt(document.getElementById('startNodeInput').value);
    const goalInput = parseInt(document.getElementById('goalNodeInput').value);

    const nodes = MAPS[currentMapKey].nodes;
    const edges = MAPS[currentMapKey].edges;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Vẽ các đường nối (Edges)
    ctx.strokeStyle = "#dfe6e9";
    ctx.lineWidth = 2;
    for (let u in edges) {
        if (!nodes[u]) continue;
        edges[u].forEach(v => {
            if (!nodes[v]) return;
            ctx.beginPath();
            ctx.moveTo(nodes[u].x, nodes[u].y);
            ctx.lineTo(nodes[v].x, nodes[v].y);
            ctx.stroke();
        });
    }

    // 2. Vẽ các nốt và Icons
    for (let id in nodes) {
        const node = nodes[id];
        const idInt = parseInt(id);

        // HIỂN THỊ ĐIỂM KẾT THÚC (B)
        if (idInt === goalInput) { 
            ctx.drawImage(homeImg, node.x - 25, node.y - 50, 50, 50);
            ctx.fillStyle = "#2c3e50";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("ĐÍCH B", node.x, node.y + 20);
        } 
        // HIỂN THỊ VỊ TRÍ NGƯỜI (Khi đang chạy)
        else if (idInt === currentNodeId) { 
            ctx.drawImage(personImg, node.x - 20, node.y - 45, 40, 40);
        } 
        // HIỂN THỊ CÁC NỐT KHÁC
        else {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);

            // LOGIC MÀU SẮC DỰA TRÊN INPUT
            if (idInt === startInput) {
                ctx.fillStyle = "#2ecc71"; // Màu xanh cho điểm xuất phát A
            } else if (deadEnds && deadEnds.has(idInt)) {
                ctx.fillStyle = "#d63031"; // Màu đỏ cho ngõ cụt
            } else if (currentPath.includes(idInt)) {
                ctx.fillStyle = "#f1c40f"; // Màu vàng cho đường đã đi
            } else {
                ctx.fillStyle = "#3498db"; // Màu xanh dương mặc định
            }

            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(id, node.x, node.y + 5);
        }
    }
}

// Xử lý khi đổi Map trên menu Select
document.getElementById('mapSelect').onchange = (e) => {
    currentMapKey = e.target.value;
    document.getElementById('status').innerText = "Sẵn sàng...";
    document.getElementById('costStat').innerText = "-";
    document.getElementById('timeStat').innerText = "-";
    drawGraph();
};

// Xử lý nút START
document.getElementById('startBtn').onclick = async () => {
    // Lấy giá trị nhập vào từ người dùng
    const startNode = parseInt(document.getElementById('startNodeInput').value);
    const goalNode = parseInt(document.getElementById('goalNodeInput').value);
    const algoType = document.getElementById('algoSelect').value;

    // Kiểm tra nốt nhập vào có tồn tại trong Map không
    const nodes = MAPS[currentMapKey].nodes;
    if (!nodes[startNode] || !nodes[goalNode]) {
        alert("Nốt bắt đầu hoặc kết thúc không tồn tại trên bản đồ!");
        return;
    }

    document.getElementById('startBtn').disabled = true;
    document.getElementById('status').innerText = `Đang tìm đường từ ${startNode} đến ${goalNode}...`;

    let generator;
    if (algoType === 'hc') generator = pureHillClimbing(startNode, goalNode);
    else if (algoType === 'hcbt') generator = hillClimbingWithBacktracking(startNode, goalNode);
    else generator = aStar(startNode, goalNode);

    for await (let step of generator) {
        drawGraph(step.path, step.curr, step.deadEnds);
        document.getElementById('status').innerText = step.status;
        document.getElementById('costStat').innerText = (step.path.length * 10) + " km";
        
        await new Promise(r => setTimeout(r, algoType === 'astar' ? 200 : 500));
    }

    const endTime = performance.now();
    document.getElementById('timeStat').innerText = ((endTime - startTime) / 1000).toFixed(2) + " s";
    document.getElementById('startBtn').disabled = false;
};

// Nút Đặt lại (Reset)
document.getElementById('resetBtn').onclick = () => {
    location.reload();
};

// QUAN TRỌNG: Vẽ map ngay khi load trang
window.onload = () => {
    drawGraph();
    // Vẽ lại lần nữa khi ảnh load xong để đảm bảo hiện icon
    homeImg.onload = () => drawGraph();
    personImg.onload = () => drawGraph();
};

document.getElementById('startNodeInput').oninput = () => drawGraph();
document.getElementById('goalNodeInput').oninput = () => drawGraph();