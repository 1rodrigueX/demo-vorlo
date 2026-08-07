use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

// ⚙️  URL que o app abre depois do launcher. Vai direto pro login: quem tem o
//     app já é cliente, loga e cai nos seus acessos. Precisa ser um endereço
//     ao vivo.
const APP_URL: &str = "https://falaai.cloud/login";

/// Abre o CRM numa janela própria e fecha o launcher.
///
/// Chamada pelo botão "Entrar" da tela local. A janela do CRM é externa
/// (carrega o site), então o launcher precisa sair de cena — senão ficam duas
/// janelas e o usuário não sabe qual é a do sistema.
#[tauri::command]
async fn abrir_crm(app: tauri::AppHandle) -> Result<(), String> {
    let url: tauri::Url = APP_URL.parse().map_err(|_| "URL do CRM inválida".to_string())?;

    WebviewWindowBuilder::new(&app, "crm", WebviewUrl::External(url))
        .title("Synexa")
        .inner_size(1280.0, 820.0)
        .min_inner_size(940.0, 620.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(launcher) = app.get_webview_window("main") {
        let _ = launcher.close();
    }

    Ok(())
}

/// Versão instalada, mostrada na aba Atualizações.
#[tauri::command]
fn versao_atual(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![abrir_crm, versao_atual])
        .setup(|app| {
            // O launcher é uma página local (dist/index.html), não o site: é
            // ele que dá a aba de Atualizações ANTES do login, que é o ponto
            // de o usuário conseguir atualizar sem baixar nada à mão.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Synexa")
                .inner_size(460.0, 560.0)
                .resizable(false)
                .center()
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o app Synexa");
}
