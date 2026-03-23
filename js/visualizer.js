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

    // LẤY GIÁ TRỊ ĐÍCH TỪ INPUT ĐỂ VẼ NHÀ CHO ĐÚNG
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

        // THAY ĐỔI Ở ĐÂY: Dùng goalInput thay vì số 19 cứng nhắc
        if (idInt === goalInput) { 
            ctx.drawImage(homeImg, node.x - 25, node.y - 50, 50, 50);
            ctx.fillStyle = "#2c3e50";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("ĐÍCH B", node.x, node.y + 20);
        } 
        else if (idInt === currentNodeId) { 
            ctx.drawImage(personImg, node.x - 20, node.y - 45, 40, 40);
        } 
        else {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);

            // Dùng startInput để tô màu xanh nốt bắt đầu
            if (idInt === startInput) {
                ctx.fillStyle = "#2ecc71"; 
            } else if (deadEnds && deadEnds.has(idInt)) {
                ctx.fillStyle = "#d63031"; 
            } else if (currentPath.includes(idInt)) {
                ctx.fillStyle = "#f1c40f"; 
            } else {
                ctx.fillStyle = "#3498db"; 
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
    const startNode = parseInt(document.getElementById('startNodeInput').value);
    const goalNode = parseInt(document.getElementById('goalNodeInput').value);
    const algoType = document.getElementById('algoSelect').value;

    const nodes = MAPS[currentMapKey].nodes;
    if (!nodes[startNode] || !nodes[goalNode]) {
        alert("Nốt không tồn tại!");
        return;
    }

    // 1. Khởi tạo trạng thái ban đầu
    const startTime = performance.now();
    document.getElementById('startBtn').disabled = true;
    document.getElementById('resultStat').innerText = "Đang chạy...";
    document.getElementById('timeStat').innerText = "0";
    document.getElementById('costStat').innerText = "0 km";

    let generator;
    if (algoType === 'hc') generator = pureHillClimbing(startNode, goalNode);
    else if (algoType === 'hcbt') generator = hillClimbingWithBacktracking(startNode, goalNode);
    else generator = aStar(startNode, goalNode);

    let lastStep;
    for await (let step of generator) {
        if (!step) break;
        lastStep = step;

        // Cập nhật giao diện
        drawGraph(step.path || [], step.curr, step.deadEnds || new Set());
        
        // Cập nhật text trạng thái
        document.getElementById('status').innerText = step.status;
        
        // Cập nhật chi phí (Giả sử mỗi bước là 10km)
        if (step.path) {
            document.getElementById('costStat').innerText = (step.path.length * 10) + " km";
        }

        await new Promise(r => setTimeout(r, algoType === 'astar' ? 150 : 400));
    }

    // 2. Kết thúc: Hiển thị thời gian và kết quả cuối cùng
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(0); // Đổi thành ms theo HTML của bạn
    
    document.getElementById('timeStat').innerText = duration;
    
    if (lastStep && lastStep.status.includes("THÀNH CÔNG")) {
        document.getElementById('resultStat').innerText = "Hoàn thành";
        document.getElementById('resultStat').style.color = "#2ecc71";
    } else {
        document.getElementById('resultStat').innerText = "Thất bại/Kẹt";
        document.getElementById('resultStat').style.color = "#d63031";
    }

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
