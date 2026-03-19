/**
 * Hàm Heuristic tính khoảng cách Euclid dựa trên Map đang chọn
 */
const getHeuristic = (id, goalId) => {
    // Lấy tọa độ từ Map hiện hành (currentMapKey được định nghĩa trong visualizer.js)
    const nodes = MAPS[currentMapKey].nodes;
    const n = nodes[id], g = nodes[goalId];
    if (!n || !g) return Infinity;
    return Math.sqrt((n.x - g.x)**2 + (n.y - g.y)**2);
};

/**
 * Lấy danh sách kề dựa trên Map đang chọn
 */
const getNeighbors = (id) => {
    return MAPS[currentMapKey].edges[id] || [];
};

// 1. Hill Climbing (Thường) - Dễ bị kẹt tại tối ưu cục bộ
async function* pureHillClimbing(start, goal) {
    let curr = start;
    let path = [curr];
    yield { path, curr, status: "Bắt đầu tìm đường (HC)..." };

    while (curr !== goal) {
        let neighbors = getNeighbors(curr);
        if (neighbors.length === 0) break;

        // Chọn hàng xóm có h(n) nhỏ nhất
        let sortedNeighbors = [...neighbors].sort((a, b) => getHeuristic(a, goal) - getHeuristic(b, goal));
        let best = sortedNeighbors[0];

        // Nếu hàng xóm tốt nhất không gần đích hơn hiện tại -> Kẹt cục bộ
        if (getHeuristic(best, goal) >= getHeuristic(curr, goal)) {
            yield { path, curr, status: "THẤT BẠI: Kẹt tại tối ưu cục bộ (Ngõ cụt)!" };
            return false;
        }

        curr = best;
        path.push(curr);
        yield { path, curr, status: `Di chuyển tới ${curr}...` };
    }
    
    if (curr === goal) yield { path, curr, status: "THÀNH CÔNG: Đã về nhà!" };
    return curr === goal;
}

// 2. Hill Climbing with Backtracking (Sửa lỗi ngõ cụt)
async function* hillClimbingWithBacktracking(start, goal) {
    let path = [start];
    let deadEnds = new Set(); 
    
    yield { path: [...path], curr: start, status: "Khởi hành (HC + Backtracking)..." };

    while (path.length > 0) {
        let curr = path[path.length - 1];

        if (curr === goal) {
            yield { path: [...path], curr: curr, status: "THÀNH CÔNG: Tìm thấy đường vòng!" };
            return true;
        }

        // Lọc hàng xóm: chưa có trong đường đi hiện tại và không phải ngõ cụt
        let neighbors = getNeighbors(curr)
            .filter(n => !path.includes(n) && !deadEnds.has(n))
            .sort((a, b) => getHeuristic(a, goal) - getHeuristic(b, goal));

        if (neighbors.length > 0) {
            let nextNode = neighbors[0]; 
            path.push(nextNode);
            yield { 
                path: [...path], 
                curr: nextNode, 
                status: `Tiến tới ${nextNode}. Còn cách: ${getHeuristic(nextNode, goal).toFixed(1)}m` 
            };
        } else {
            // Thực hiện Backtracking
            deadEnds.add(curr);
            let failedNode = path.pop(); 
            let prevNode = path[path.length - 1];
            
            yield { 
                path: [...path], 
                curr: prevNode, 
                status: `GẶP BẪY TẠI ${failedNode}! Đang quay lui về ${prevNode}...`,
                isBacktracking: true 
            };
        }
    }
    return false;
}

// 3. Giải thuật A* (Tối ưu nhất)
async function* aStar(start, goal) {
    let openList = [{id: start, f: 0, g: 0, path: [start]}];
    let closedList = new Set();

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        let current = openList.shift();
        
        if (current.id === goal) {
            yield { path: current.path, curr: current.id, status: "THÀNH CÔNG: A* đã tìm đường ngắn nhất!" };
            return true;
        }

        closedList.add(current.id);
        let neighbors = getNeighbors(current.id);

        for (let neighborId of neighbors) {
            if (closedList.has(neighborId)) continue;
            
            let g = current.g + 1; 
            let h = getHeuristic(neighborId, goal);
            let f = g + h;

            // Kiểm tra xem nốt này đã có trong openList với chi phí thấp hơn chưa
            let existing = openList.find(o => o.id === neighborId);
            if (!existing || g < existing.g) {
                if (existing) openList = openList.filter(o => o.id !== neighborId);
                openList.push({ id: neighborId, g, f, path: [...current.path, neighborId] });
            }
        }
        yield { path: current.path, curr: current.id, status: "A* đang tính toán toàn cục..." };
    }
}