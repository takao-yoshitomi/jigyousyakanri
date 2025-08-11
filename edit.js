document.addEventListener('DOMContentLoaded', () => {
    const clientNameSpan = document.getElementById('client-name');
    const fiscalMonthSelect = document.getElementById('fiscal-month');
    const accountingMethodSelect = document.getElementById('accounting-method');
    const saveButton = document.getElementById('save-button');

    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = parseInt(urlParams.get('no'));

    let currentClient = null;

    // clients variable is now globally available from data.js
    if (clientNo) {
        currentClient = clients.find(client => client.no === clientNo);
    }

    if (currentClient) {
        clientNameSpan.textContent = currentClient.name;
        fiscalMonthSelect.value = currentClient.fiscalMonth;
        accountingMethodSelect.value = currentClient.accountingMethod;

        // カスタムプルダウンの表示を更新
        const fiscalMonthTrigger = fiscalMonthSelect.closest('.custom-select-wrapper').querySelector('.custom-select-trigger');
        fiscalMonthTrigger.textContent = fiscalMonthSelect.options[fiscalMonthSelect.selectedIndex].textContent;

        const accountingMethodTrigger = accountingMethodSelect.closest('.custom-select-wrapper').querySelector('.custom-select-trigger');
        accountingMethodTrigger.textContent = accountingMethodSelect.options[accountingMethodSelect.selectedIndex].textContent;

        // Initialize custom dropdowns
        

    } else {
        // Handle case where client is not found or no is missing
        clientNameSpan.textContent = 'クライアントが見つかりません。';
        saveButton.disabled = true;
    }

    saveButton.addEventListener('click', () => {
        if (currentClient) {
            currentClient.fiscalMonth = fiscalMonthSelect.value;
            currentClient.accountingMethod = accountingMethodSelect.value;
            saveData(clients, clientDetails); // Save updated clients to localStorage
            alert('変更を保存しました！');
            // Optionally, redirect back to index.html or update UI
            // window.location.href = 'index.html';
        }
    });
});