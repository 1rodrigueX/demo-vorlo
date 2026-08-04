// Sem console no build release do Windows (só a janela do app).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    synexa_desktop_lib::run()
}
