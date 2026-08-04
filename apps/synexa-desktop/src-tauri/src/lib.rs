use tauri::{WebviewUrl, WebviewWindowBuilder};

// ⚙️  URL do site que o app abre. Troque para o domínio final (synexa.cloud)
//     quando o DNS estiver 100% apontado. Precisa ser um endereço ao vivo.
const APP_URL: &str = "https://synexa.cloud";

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
