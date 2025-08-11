document.addEventListener('DOMContentLoaded', () => {
    const clientsTableBody = document.querySelector('#clients-table tbody');
    const searchInput = document.getElementById('search-input');
    const clientsTableHeadRow = document.querySelector('#clients-table thead tr');

    let currentSortKey = 'fiscalMonth'; // 初期ソートキー
    let currentSortDirection = 'asc'; // 初期ソート方向

    // ヘッダーのテキストと対応するソートキーのマップ
    const headerMap = {
        'No.': 'no',
        '事業所名': 'name',
        '決算月': 'fiscalMonth',
        '未入力月間': 'unattendedMonths',
        '月次進捗': 'monthlyProgress',
        '担当者': '担当者',
        '経理方式': 'accountingMethod',
        '進捗ステータス': 'status'
        // '月次進捗詳細' はソート対象外
    };

    // Add new header for No.
    const noTh = document.createElement('th');
    noTh.textContent = 'No.';
    clientsTableHeadRow.insertBefore(noTh, clientsTableHeadRow.firstChild); // Add No. at the beginning

    // Add new header for 月次進捗詳細
    const newTh = document.createElement('th');
    newTh.textContent = '登録情報編集';
    clientsTableHeadRow.appendChild(newTh);

    // すべてのヘッダー要素を取得し、ソート機能を追加
    Array.from(clientsTableHeadRow.children).forEach(th => {
        const headerText = th.textContent.trim();
        let sortKey = headerMap[headerText];

        if (headerText === 'No.') {
            sortKey = 'no';
        }

        if (sortKey) {
            th.dataset.sortKey = sortKey;
            const sortIconSpan = document.createElement('span');
            sortIconSpan.classList.add('sort-icon');
            th.appendChild(sortIconSpan);
        }
    });

    // ヘッダーにクリックイベントリスナーを設定
    clientsTableHeadRow.addEventListener('click', (event) => {
        const targetTh = event.target.closest('th');
        if (targetTh && targetTh.dataset.sortKey) {
            const sortKey = targetTh.dataset.sortKey;

            if (currentSortKey === sortKey) {
                // 同じ列がクリックされたらソート方向を反転
                currentSortDirection = (currentSortDirection === 'asc') ? 'desc' : 'asc';
            } else {
                // 異なる列がクリックされたら新しいソートキーを設定し、昇順にリセット
                currentSortKey = sortKey;
                currentSortDirection = 'asc';
            }
            renderClients(searchInput.value); // ソートを適用して再描画
        }
    });

    // 月を数値に変換するヘルパー関数
    function monthToNumber(monthStr) {
        const months = {
            '1月': 1, '2月': 2, '3月': 3, '4月': 4, '5月': 5, '6月': 6,
            '7月': 7, '8月': 8, '9月': 9, '10月': 10, '11月': 11, '12月': 12
        };
        return months[monthStr];
    }

    // ソートアイコンとソート中の列のスタイルを更新する関数
    function updateSortIcons() {
        Array.from(clientsTableHeadRow.children).forEach(th => {
            const sortIcon = th.querySelector('.sort-icon');
            th.classList.remove('sorted-column'); // まず全ての列からクラスを削除

            if (sortIcon) {
                sortIcon.classList.remove('asc', 'desc');
                if (th.dataset.sortKey === currentSortKey) {
                    sortIcon.classList.add(currentSortDirection);
                    th.classList.add('sorted-column'); // ソート中の列にクラスを追加
                }
            }
        });
    }

    function renderClients(filterText = '') {
        clientsTableBody.innerHTML = ''; // Clear existing rows

    
        const filteredClients = window.clients.filter(client => {
            const nameMatch = client.name.includes(filterText);
            const 담당자Match = client.担当者.includes(filterText);
            return nameMatch || 담당자Match;
        });

        // ソートロジック
        filteredClients.sort((a, b) => {
            let valA, valB;

            switch (currentSortKey) {
                case 'no':
                case 'unattendedMonths':
                case 'monthlyProgress': // %表記を数値としてソートする場合
                    valA = parseFloat(a[currentSortKey]);
                    valB = parseFloat(b[currentSortKey]);
                    break;
                case 'fiscalMonth':
                    valA = monthToNumber(a[currentSortKey]);
                    valB = monthToNumber(b[currentSortKey]);
                    break;
                default:
                    valA = a[currentSortKey];
                    valB = b[currentSortKey];
            }

            if (valA < valB) {
                return currentSortDirection === 'asc' ? -1 : 1;
            } else if (valA > valB) {
                return currentSortDirection === 'asc' ? 1 : -1;
            } else {
                return 0;
            }
        });

        filteredClients.forEach(client => {
            const row = clientsTableBody.insertRow();
            // Display No.
            row.insertCell().textContent = client.no; // Add No. cell
            // Link 事業所名 to details.html
            row.insertCell().innerHTML = `<a href="details.html?no=${client.no}" class="client-name-link">${client.name}</a>`;
            row.insertCell().textContent = client.fiscalMonth;
            row.insertCell().textContent = client.unattendedMonths;
            row.insertCell().textContent = client.monthlyProgress;
            row.insertCell().textContent = client.担当者;
            row.insertCell().textContent = client.accountingMethod;

            const statusCell = row.insertCell();

            // Create the custom select wrapper structure
            const customSelectWrapper = document.createElement('div');
            customSelectWrapper.classList.add('custom-select-wrapper');

            const customSelectTrigger = document.createElement('div');
            customSelectTrigger.classList.add('custom-select-trigger');
            customSelectWrapper.appendChild(customSelectTrigger);

            const customOptions = document.createElement('div');
            customOptions.classList.add('custom-options');
            customSelectWrapper.appendChild(customOptions);

            const statusSelect = document.createElement('select');
            statusSelect.className = 'status-dropdown'; // Keep this class for status color logic
            statusSelect.style.display = 'none'; // Hide the original select element
            customSelectWrapper.appendChild(statusSelect); // Append original select inside the wrapper

            const statuses = ['未着手', '依頼中', 'チェック待ち', '作業中', '完了'];
            statuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                if (client.status === status) {
                    option.selected = true;
                }
                statusSelect.appendChild(option);
            });

            statusCell.appendChild(customSelectWrapper); // Append the wrapper to the cell

            // Initialize custom dropdown after appending to DOM
            initializeCustomDropdown(statusSelect);

            // Set initial background color (apply to the wrapper of the custom select)
            updateStatusBackgroundColor(customSelectWrapper, client.status);

            statusSelect.addEventListener('change', (event) => {
                const newStatus = event.target.value;
                client.status = newStatus; // Update client data (in memory)
                updateStatusBackgroundColor(customSelectWrapper, newStatus);
                saveData(window.clients, window.clientDetails, window.staffs); // Save updated clients to localStorage
            });

            // Add new cell for 月次進捗詳細
            const monthlyProgressDetailCell = row.insertCell();
            monthlyProgressDetailCell.innerHTML = `<a href="edit.html?no=${client.no}">編集</a>`;
        });
    }

    function updateStatusBackgroundColor(element, status) {
        // Remove all existing status classes
        element.classList.remove('status-未着手', 'status-依頼中', 'status-2チェック待ち', 'status-作業中', 'status-完了');
        // Add the new status class
        element.classList.add(`status-${status}`);
    }

    // Initial render
    renderClients();
    updateSortIcons(); // 初期表示時にソートアイコンを更新

    // Search functionality
    searchInput.addEventListener('input', (event) => {
        renderClients(event.target.value);
    });

    // 管理者編集ドロップダウンの初期化
    const adminMenuSelect = document.getElementById('admin-menu-select');
    initializeCustomDropdown(adminMenuSelect);

    // 担当者編集モーダル関連の要素を取得
    const staffEditModal = document.getElementById('staff-edit-modal');
    const closeStaffModalButton = staffEditModal.querySelector('.close-button');
    const staffListContainer = document.getElementById('staff-list-container');
    const newStaffInput = document.getElementById('new-staff-input');
    const addStaffButton = document.getElementById('add-staff-button');
    const saveStaffButton = document.getElementById('save-staff-button');
    const cancelStaffButton = document.getElementById('cancel-staff-button');

    let currentEditingStaffs = []; // モーダル内で編集中の担当者リスト

    // 担当者リストをレンダリングする関数
    function renderStaffList(staffs) {
        staffListContainer.innerHTML = '';
        staffs.forEach((staff, index) => {
            const staffItem = document.createElement('div');
            staffItem.classList.add('task-item'); // task-itemクラスを再利用
            staffItem.innerHTML = `
                <input type="text" value="${staff}">
                <button class="delete-task-button" data-index="${index}">削除</button>
            `;
            staffListContainer.appendChild(staffItem);
        });
    }

    // 管理者メニューの選択イベント
    adminMenuSelect.addEventListener('change', (event) => {
        if (event.target.value === 'manage-staff') {
            currentEditingStaffs = [...window.staffs]; // 現在の担当者をコピー
            renderStaffList(currentEditingStaffs);
            staffEditModal.style.display = 'block';
        }
    });

    // モーダルを閉じる
    closeStaffModalButton.addEventListener('click', () => {
        staffEditModal.style.display = 'none';
    });

    cancelStaffButton.addEventListener('click', () => {
        staffEditModal.style.display = 'none';
    });

    // モーダルの外側をクリックで閉じる
    window.addEventListener('click', (event) => {
        if (event.target === staffEditModal) {
            staffEditModal.style.display = 'none';
        }
    });

    // 担当者追加ボタン
    addStaffButton.addEventListener('click', () => {
        const newStaffName = newStaffInput.value.trim();
        if (newStaffName && !currentEditingStaffs.includes(newStaffName)) {
            currentEditingStaffs.push(newStaffName);
            renderStaffList(currentEditingStaffs);
            newStaffInput.value = '';
        }
    });

    // 担当者削除ボタン (イベント委譲)
    staffListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-task-button')) {
            const index = parseInt(event.target.dataset.index);
            currentEditingStaffs.splice(index, 1);
            renderStaffList(currentEditingStaffs); // リレンダリングしてインデックスを更新
        }
    });

    // 担当者名変更 (inputイベント)
    staffListContainer.addEventListener('input', (event) => {
        if (event.target.tagName === 'INPUT') {
            const index = parseInt(event.target.closest('.task-item').querySelector('.delete-task-button').dataset.index);
            currentEditingStaffs[index] = event.target.value.trim();
        }
    });

    // 担当者保存ボタン
    saveStaffButton.addEventListener('click', () => {
        // 空の項目をフィルタリング
        window.staffs = currentEditingStaffs.filter(staff => staff !== '');
        saveData(window.clients, window.clientDetails, window.staffs); // データを保存
        staffEditModal.style.display = 'none';
        renderClients(searchInput.value); // メインページを再描画して変更を反映
    });
});