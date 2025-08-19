document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element Selectors ---
    const clientInfoArea = document.getElementById('client-info-area');
    const detailsTableHead = document.querySelector('#details-table thead');
    const detailsTableBody = document.querySelector('#details-table tbody');
    const notesTableHead = document.querySelector('#notes-table thead');
    const notesTableBody = document.querySelector('#notes-table tbody');
    const yearFilter = document.getElementById('year-filter');
    const editTasksButton = document.getElementById('edit-tasks-button');
    const finalizeYearButton = document.getElementById('finalize-year-button');
    const finalizedStatus = document.getElementById('finalized-status');

    // --- State Variables ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no');
    let clientDetails = null;
    let currentYearSelection = new Date().getFullYear().toString();
    let monthsToDisplay = [];
    let allTaskNames = [];

    // --- Initialization ---
    async function initializeApp() {
        if (!clientNo) {
            clientInfoArea.innerHTML = '<p>エラー: クライアントNo.が指定されていません。</p>';
            return;
        }

        setupYearFilter();

        try {
            clientDetails = await fetchClientDetails(clientNo);
            if (clientDetails) {
                addEventListeners();
                renderDetails();
            } else {
                 clientInfoArea.innerHTML = '<p>クライアントデータが見つかりません。</p>';
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            clientInfoArea.innerHTML = '<p>データの読み込み中にエラーが発生しました。</p>';
        }
    }

    // --- Data Fetching ---
    async function fetchClientDetails(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/clients/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch client details:", error);
            throw error; // Re-throw to be caught by the caller
        }
    }

    // --- UI Setup ---
    function setupYearFilter() {
        const currentYear = new Date().getFullYear();
        for (let year = 2025; year <= 2050; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year + '年';
            if (year === currentYear) { 
                option.selected = true;
            }
            yearFilter.appendChild(option);
        }
        currentYearSelection = yearFilter.value;
        initializeCustomDropdown(yearFilter);
    }

    function addEventListeners() {
        yearFilter.addEventListener('change', (event) => {
            currentYearSelection = event.target.value;
            // TODO: Persist last selected year if needed
            renderDetails();
        });

        // Buttons are disabled for now as they require save functionality
        editTasksButton.disabled = true;
        finalizeYearButton.disabled = true;
        // editTasksButton.addEventListener('click', ...);
        // finalizeYearButton.addEventListener('click', ...);
    }

    // --- Rendering Logic ---
    function renderDetails() {
        // Clear previous content
        clientInfoArea.innerHTML = '';
        detailsTableHead.innerHTML = '';
        detailsTableBody.innerHTML = '';
        notesTableHead.innerHTML = '';
        notesTableBody.innerHTML = '';

        if (!clientDetails) return;

        // For now, year finalization is disabled
        const isYearFinalized = false; 

        // Render client header info
        const clientInfoTable = document.createElement('table');
        clientInfoTable.className = 'client-info-table';
        clientInfoTable.innerHTML = `<tbody>
            <tr><th>No.</th><th>事業所名</th><th>決算月</th></tr>
            <tr><td>${clientDetails.no}</td><td>${clientDetails.name}</td><td>${clientDetails.fiscalMonth}</td></tr>
        </tbody>`;
        clientInfoArea.appendChild(clientInfoTable);

        // Determine months to display
        const fiscalMonthNum = parseInt(clientDetails.fiscalMonth.replace('月', ''));
        monthsToDisplay = [];
        for (let i = 0; i < 12; i++) {
            let month = fiscalMonthNum - i;
            let year = parseInt(currentYearSelection);
            if (month <= 0) { month += 12; year--; }
            monthsToDisplay.unshift(`${year}年${month}月`);
        }

        allTaskNames = clientDetails.customTasks || [];

        renderTaskTable(isYearFinalized);
        renderNotesTable(isYearFinalized);
    }

    function renderTaskTable(isYearFinalized) {
        const taskHeaderRow = document.createElement('tr');
        taskHeaderRow.appendChild(document.createElement('th')).textContent = '項目';
        monthsToDisplay.forEach(monthStr => {
            taskHeaderRow.appendChild(document.createElement('th')).textContent = monthStr;
        });
        detailsTableHead.appendChild(taskHeaderRow);

        allTaskNames.forEach(taskName => {
            const taskRow = detailsTableBody.insertRow();
            taskRow.insertCell().textContent = taskName;
            monthsToDisplay.forEach(monthStr => {
                const cell = taskRow.insertCell();
                cell.className = 'task-input-cell';

                let monthData = clientDetails.monthlyTasks.find(mt => mt.month === monthStr);
                const taskChecked = monthData?.tasks?.[taskName]?.checked || false;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                checkbox.checked = taskChecked;
                checkbox.disabled = isYearFinalized;
                cell.appendChild(checkbox);
                
                if (checkbox.checked) {
                    cell.classList.add('task-completed');
                }

                checkbox.addEventListener('change', () => {
                    // TODO: Implement API call to save checkbox state
                    console.log(`Checkbox for ${taskName} in ${monthStr} changed to ${checkbox.checked}`);
                     if (checkbox.checked) {
                        cell.classList.add('task-completed');
                    } else {
                        cell.classList.remove('task-completed');
                    }
                });
            });
        });

        const statusRow = detailsTableBody.insertRow();
        statusRow.insertCell().textContent = '月次ステータス';
        monthsToDisplay.forEach(monthStr => {
            const statusCell = statusRow.insertCell();
            statusCell.className = 'monthly-status';
            const targetMonthData = clientDetails.monthlyTasks.find(mt => mt.month === monthStr);
            updateStatusCell(statusCell, targetMonthData, allTaskNames);
        });
    }

    function renderNotesTable(isYearFinalized) {
        const notesHeaderRow = notesTableHead.insertRow();
        notesHeaderRow.insertCell().textContent = '項目';
        monthsToDisplay.forEach(monthStr => {
            notesHeaderRow.insertCell().textContent = monthStr;
        });

        const urlRow = notesTableBody.insertRow();
        urlRow.insertCell().textContent = 'URL';
        const memoRow = notesTableBody.insertRow();
        memoRow.insertCell().textContent = 'メモ';

        monthsToDisplay.forEach(monthStr => {
            let monthData = clientDetails.monthlyTasks.find(mt => mt.month === monthStr) || {};
            
            const urlCell = urlRow.insertCell();
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = monthData.url || '';
            urlInput.placeholder = 'URLを入力';
            urlInput.disabled = isYearFinalized;
            urlInput.addEventListener('input', (e) => {
                 // TODO: Implement API call to save URL
                 console.log(`URL for ${monthStr} changed to ${e.target.value}`);
            });
            urlCell.appendChild(urlInput);

            const memoCell = memoRow.insertCell();
            const memoTextarea = document.createElement('textarea');
            memoTextarea.value = monthData.memo || '';
            memoTextarea.placeholder = 'メモを入力';
            memoTextarea.rows = 12;
            memoTextarea.disabled = isYearFinalized;
            memoTextarea.addEventListener('input', (e) => {
                // TODO: Implement API call to save memo
                console.log(`Memo for ${monthStr} changed to ${e.target.value}`);
            });
            memoCell.appendChild(memoTextarea);
        });
    }

    function updateStatusCell(cell, monthData, taskNames) {
        if (!monthData || !monthData.tasks || taskNames.length === 0) {
            cell.textContent = '-';
            cell.style.backgroundColor = '#f0f0f0';
            return;
        }
        const totalTasks = taskNames.length;
        const completedTasks = taskNames.filter(task => monthData.tasks[task]?.checked).length;

        if (totalTasks === completedTasks) {
            cell.textContent = '月次完了';
            cell.style.backgroundColor = '#ccffcc';
        } else if (completedTasks === 0) {
            cell.textContent = '未入力';
            cell.style.backgroundColor = '#e0e0e0';
        } else {
            const percentage = Math.round((completedTasks / totalTasks) * 100);
            cell.textContent = `${percentage}%`;
            cell.style.backgroundColor = '#ffff99';
        }
    }

    // --- Run Application ---
    initializeApp();
});