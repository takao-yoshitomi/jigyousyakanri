document.addEventListener('DOMContentLoaded', () => {
    const clientInfoArea = document.getElementById('client-info-area');
    const detailsTableHead = document.querySelector('#details-table thead');
    const detailsTableBody = document.querySelector('#details-table tbody');
    // const fiscalMonthFilter = document.getElementById('fiscal-month-filter'); // コメントアウト
    const yearFilter = document.getElementById('year-filter'); // 新しい要素

    // initializeCustomDropdown(fiscalMonthFilter); // コメントアウト

    // 年度ドロップダウンのオプションを生成
    const currentYear = new Date().getFullYear();
    for (let year = 2025; year <= 2050; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        if (year === currentYear) { // 初期値として現在の年を選択
            option.selected = true;
        }
        yearFilter.appendChild(option);
    }

    // Initialize custom dropdown for yearFilter AFTER options are populated
    initializeCustomDropdown(yearFilter);

    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no');

    // let currentFiscalMonth = fiscalMonthFilter.value; // コメントアウト
    let currentYearSelection = yearFilter.value;

    let sampleClient; // sampleClient をグローバルスコープで定義
    let monthsToDisplay = []; // monthsToDisplay をグローバルスコープで定義

    function renderDetails() { // filterMonth 引数を削除
        clientInfoArea.innerHTML = '';
        detailsTableHead.innerHTML = '';
        detailsTableBody.innerHTML = '';

        let displayClientDetails = clientDetails;

        if (clientNo) {
            displayClientDetails = clientDetails.filter(client => client.no == clientNo);
        }

        // const filteredClients = displayClientDetails.filter(client => { // コメントアウト
        //     return filterMonth === 'all' || client.fiscalMonth.includes(filterMonth);
        // });

        // if (filteredClients.length === 0) { // コメントアウト
        //     detailsTableBody.innerHTML = '<tr><td colspan="99">該当するクライアントが見つかりません。</td></tr>
        //     return;
        // }

        // sampleClient = filteredClients[0]; // コメントアウト
        sampleClient = displayClientDetails[0]; // 修正

        // sampleClient が undefined の場合に備える
        if (!sampleClient) {
            detailsTableBody.innerHTML = '<tr><td colspan="99">クライアントデータが不正です。</td></tr>';
            return;
        }

        // --- クライアント基本情報テーブルの生成 ---
        const clientInfoTable = document.createElement('table');
        clientInfoTable.className = 'client-info-table';
        const clientInfoTbody = document.createElement('tbody');
        clientInfoTable.appendChild(clientInfoTbody);

        const infoRow1 = clientInfoTbody.insertRow();
        infoRow1.insertCell().textContent = 'No.';
        infoRow1.insertCell().textContent = '事業所名';
        infoRow1.insertCell().textContent = '決算月';

        const infoRow2 = clientInfoTbody.insertRow();
        infoRow2.insertCell().textContent = sampleClient.no;
        infoRow2.insertCell().textContent = sampleClient.name;
        infoRow2.insertCell().textContent = sampleClient.fiscalMonth;

        clientInfoArea.appendChild(clientInfoTable);


        // --- タスク・チェックボックステーブルのヘッダー生成 ---
        const taskHeaderRow = document.createElement('tr');
        taskHeaderRow.insertCell().textContent = ''; // タスク名のための空セル

        // 決算月から12ヶ月前までの月を生成
        const fiscalMonthNum = parseInt(sampleClient.fiscalMonth.replace('月', ''));
        monthsToDisplay = []; // グローバルスコープの monthsToDisplay を更新
        for (let i = 0; i < 12; i++) {
            let month = fiscalMonthNum - i;
            let year = parseInt(currentYearSelection); // 選択された年度
            if (month <= 0) {
                month += 12;
                year--; // 前の年にする
            }
            monthsToDisplay.unshift(`${year}年${month}月`); // 逆順に追加して古い順にする
        }

        monthsToDisplay.forEach(monthStr => {
            const monthHeader = document.createElement('th');
            monthHeader.textContent = monthStr;
            taskHeaderRow.appendChild(monthHeader);
        });
        detailsTableHead.appendChild(taskHeaderRow);

        // --- タスク・チェックボックステーブルのボディ生成 ---
        const allTaskNames = sampleClient.customTasks || (sampleClient.monthlyTasks[0] ? Object.keys(sampleClient.monthlyTasks[0].tasks) : []);
        allTaskNames.forEach(taskName => {
            const taskRow = detailsTableBody.insertRow();
            taskRow.insertCell().textContent = taskName; // タスク名（一番左の列）
            
            monthsToDisplay.forEach(monthStr => {
                const cell = taskRow.insertCell();
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                
                // 該当する月のタスクデータを見つける
                const targetMonthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
                if (targetMonthData && targetMonthData.tasks[taskName] !== undefined) {
                    checkbox.checked = targetMonthData.tasks[taskName];
                } else {
                    checkbox.checked = false; // データがない場合はチェックなし
                }

                checkbox.addEventListener('change', () => {
                    // 変更されたチェックボックスの月とタスク名を特定し、データを更新
                    const changedMonth = monthStr;
                    const changedTaskName = taskName;
                    let targetClientMonthData = sampleClient.monthlyTasks.find(mt => mt.month === changedMonth);
                    if (!targetClientMonthData) { // データがない場合は新しく作成
                        targetClientMonthData = { month: changedMonth, tasks: {} };
                        sampleClient.monthlyTasks.push(targetClientMonthData);
                    }
                    targetClientMonthData.tasks[changedTaskName] = checkbox.checked;
                    updateMonthlyStatus(statusRow, targetClientMonthData, allTaskNames, sampleClient); // 修正
                    saveData(clients, clientDetails);
                });
                cell.appendChild(checkbox);
            });
        });

        // 月次ステータス行
        const statusRow = detailsTableBody.insertRow();
        statusRow.insertCell().textContent = '月次ステータス'; // 一番左の列に表示

        monthsToDisplay.forEach(monthStr => {
            const statusCell = statusRow.insertCell();
            statusCell.className = 'monthly-status';
            const targetMonthData = sampleClient.monthlyTasks.find(mt => mt.month === monthStr);
            if (targetMonthData) {
                const totalTasks = Object.keys(targetMonthData.tasks).length;
                const completedTasks = Object.values(targetMonthData.tasks).filter(Boolean).length;
                if (totalTasks === completedTasks) {
                    statusCell.textContent = '月次完了';
                    statusCell.style.backgroundColor = '#ccffcc';
                } else if (completedTasks === 0) {
                    statusCell.textContent = '未入力';
                    statusCell.style.backgroundColor = '#e0e0e0';
                } else {
                    const percentage = Math.round((completedTasks / totalTasks) * 100);
                    statusCell.textContent = `${percentage}%`;
                    statusCell.style.backgroundColor = '#ffff99';
                }
            } else {
                statusCell.textContent = 'データなし'; // データがない月のステータス
                statusCell.style.backgroundColor = '#f0f0f0';
            }
        });
    }

    function updateMonthlyStatus(row, monthData, taskNames, clientData) {
        const totalTasks = taskNames.length;
        const completedTasks = Object.values(monthData.tasks).filter(Boolean).length;
        
        // 該当する月次ステータスセルを見つける
        const statusRow = detailsTableBody.querySelector('tr:last-child'); // 月次ステータス行は常に最後
        const monthIndex = monthsToDisplay.findIndex(m => m === monthData.month);
        const targetStatusCell = statusRow.cells[monthIndex + 1]; // 最初のセルが「月次ステータス」なので+1


        if (completedTasks === totalTasks) {
            targetStatusCell.textContent = '月次完了';
            targetStatusCell.style.backgroundColor = '#ccffcc';
        } else if (completedTasks === 0) {
            targetStatusCell.textContent = '未入力';
            targetStatusCell.style.backgroundColor = '#e0e0e0';
        } else {
            const percentage = Math.round((completedTasks / totalTasks) * 100);
            targetStatusCell.textContent = `${percentage}%`;
            targetStatusCell.style.backgroundColor = '#ffff99';
        }
    }

    // Initial render based on URL parameter or default
    renderDetails(); // 引数を削除

    // Filter change event // コメントアウト
    // fiscalMonthFilter.addEventListener('change', (event) => {
    //     currentFiscalMonth = event.target.value;
    //     renderDetails(currentFiscalMonth);
    // });

    // Year filter change event
    yearFilter.addEventListener('change', (event) => {
        currentYearSelection = event.target.value;
        renderDetails(); // 引数を削除
    });

    // モーダル関連の要素を取得
    const editTasksButton = document.getElementById('edit-tasks-button');
    const taskEditModal = document.getElementById('task-edit-modal');
    const closeButton = taskEditModal.querySelector('.close-button');
    const taskListContainer = document.getElementById('task-list-container');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskButton = document.getElementById('add-task-button');
    const saveTasksButton = document.getElementById('save-tasks-button');
    const cancelTasksButton = document.getElementById('cancel-tasks-button');

    let currentEditingTasks = []; // モーダル内で編集中のタスクリスト

    // タスクリストをレンダリングする関数
    function renderTaskList(tasks) {
        taskListContainer.innerHTML = '';
        tasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            taskItem.innerHTML = `
                <input type="text" value="${task}">
                <button class="delete-task-button" data-index="${index}">削除</button>
            `;
            taskListContainer.appendChild(taskItem);
        });
    }

    // モーダルを開く
    editTasksButton.addEventListener('click', () => {
        currentEditingTasks = [...(sampleClient.customTasks || [])]; // 現在のタスクをコピー
        renderTaskList(currentEditingTasks);
        taskEditModal.style.display = 'block';
    });

    // モーダルを閉じる
    closeButton.addEventListener('click', () => {
        taskEditModal.style.display = 'none';
    });

    cancelTasksButton.addEventListener('click', () => {
        taskEditModal.style.display = 'none';
    });

    // モーダルの外側をクリックで閉じる
    window.addEventListener('click', (event) => {
        if (event.target === taskEditModal) {
            taskEditModal.style.display = 'none';
        }
    });

    // タスク追加ボタン
    addTaskButton.addEventListener('click', () => {
        const newTaskName = newTaskInput.value.trim();
        if (newTaskName && !currentEditingTasks.includes(newTaskName)) {
            currentEditingTasks.push(newTaskName);
            renderTaskList(currentEditingTasks);
            newTaskInput.value = '';
        }
    });

    // タスク削除ボタン (イベント委譲)
    taskListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-task-button')) {
            const index = parseInt(event.target.dataset.index);
            currentEditingTasks.splice(index, 1);
            renderTaskList(currentEditingTasks); // リレンダリングしてインデックスを更新
        }
    });

    // タスク名変更 (inputイベント)
    taskListContainer.addEventListener('input', (event) => {
        if (event.target.tagName === 'INPUT') {
            const index = parseInt(event.target.closest('.task-item').querySelector('.delete-task-button').dataset.index);
            currentEditingTasks[index] = event.target.value.trim();
        }
    });

    // タスク保存ボタン
    saveTasksButton.addEventListener('click', () => {
        // 空の項目をフィルタリング
        sampleClient.customTasks = currentEditingTasks.filter(task => task !== '');
        saveData(clients, clientDetails); // データを保存
        taskEditModal.style.display = 'none';
        renderDetails(); // 詳細ページを再描画して変更を反映
    });
});