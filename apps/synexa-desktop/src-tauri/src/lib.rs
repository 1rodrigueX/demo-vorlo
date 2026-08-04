use tauri::{WebviewUrl, WebviewWindowBuilder};

// ⚙️  URL que o app abre. Vai direto pro login: quem tem o app já é cliente,
//     loga e cai nos seus acessos. Troque o domínio quando migrar pra
//     synexa.cloud. Precisa ser um endereço ao vivo.
const APP_URL: &str = "https://falaai.cloud/login";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let url: tauri::Url = APP_URL.parse().expect("APP_URL inválida");
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
                .title("Synexa")
                .inner_size(1280.0, 820.0)
                .min_inner_size(940.0, 620.0)
                .center()
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o app Synexa");
}
