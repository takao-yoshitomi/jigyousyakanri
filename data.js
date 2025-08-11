// data.js

// localStorageからデータをロードする関数
function loadData() {
    const storedClients = localStorage.getItem('clients');
    const storedClientDetails = localStorage.getItem('clientDetails');

    let initialClients = [
        { no: 101, name: "株式会社アルファ", fiscalMonth: "1月", unattendedMonths: "7ヵ月", monthlyProgress: "2026年1月迄",担当者: "佐藤", accountingMethod: "記帳代行" , status: "完了" },
        { no: 103, name: "合同会社ベータ", fiscalMonth: "1月", unattendedMonths: "7ヵ月", monthlyProgress: "2026年1月迄",担当者: "鈴木", accountingMethod: "自計" , status: "完了" },
        { no: 201, name: "株式会社ガンマ", fiscalMonth: "2月", unattendedMonths: "6ヵ月", monthlyProgress: "2026年2月迄",担当者: "高橋", accountingMethod: "自計" , status: "完了" },
        { no: 301, name: "有限会社デルタ", fiscalMonth: "3月", unattendedMonths: "5ヵ月", monthlyProgress: "2026年3月迄",担当者: "田中", accountingMethod: "記帳代行" , status: "2チェック待ち" },
        { no: 308, name: "株式会社イプシロン", fiscalMonth: "3月", unattendedMonths: "5ヵ月", monthlyProgress: "2026年3月迄",担当者: "渡辺", accountingMethod: "記帳代行" , status: "依頼中" }
    ];

    let initialClientDetails = [
        {
            no: 101, name: "株式会社アルファ", fiscalMonth: "1月",担当者: "佐藤",
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了" },
                { month: "2025年8月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了" }
            ]
        },
        {
            no: 103, name: "合同会社ベータ", fiscalMonth: "1月",担当者: "鈴木",
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力" },
                { month: "2025年8月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力" }
            ]
        },
        {
            no: 201, name: "株式会社ガンマ", fiscalMonth: "2月",担当者: "高橋",
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "13%" },
                { month: "2025年8月", tasks: { 受付: true, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "13%" }
            ]
        },
        {
            no: 301, name: "有限会社デルタ", fiscalMonth: "3月",担当者: "田中",
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了" },
                { month: "2025年8月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了" }
            ]
        },
        {
            no: 308, name: "株式会社イプシロン", fiscalMonth: "3月",担当者: "渡辺",
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力" },
                { month: "2025年8月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力" }
            ]
        }
    ];

    const clients = storedClients ? JSON.parse(storedClients) : initialClients;
    const clientDetails = storedClientDetails ? JSON.parse(storedClientDetails) : initialClientDetails;

    return { clients, clientDetails };
}

// localStorageにデータを保存する関数
function saveData(clients, clientDetails) {
    localStorage.setItem('clients', JSON.stringify(clients));
    localStorage.setItem('clientDetails', JSON.stringify(clientDetails));
}

// グローバル変数としてエクスポート
const data = loadData();
window.clients = data.clients;
window.clientDetails = data.clientDetails;
