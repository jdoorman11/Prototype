// Load header component
document.addEventListener('DOMContentLoaded', function() {
  // Load header
  const headerElement = document.querySelector('header[data-component="header"]');
  if (headerElement) {
    fetch('/components/header.html')
      .then(response => response.text())
      .then(html => {
        headerElement.outerHTML = html;
      })
      .catch(error => {
        console.error('Error loading header:', error);
      });
  }
});
