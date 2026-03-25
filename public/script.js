function atualizarStatus() {
  fetch("/")
    .then(res => res.text())
    .then(() => {
      alert("Status atualizado!");
      location.reload();
    });
}