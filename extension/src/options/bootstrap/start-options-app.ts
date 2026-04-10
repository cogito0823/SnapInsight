const OPTIONS_ROOT_ID = "app";

export function startOptionsApp(): void {
  const root = document.getElementById(OPTIONS_ROOT_ID) ?? document.body;

  root.innerHTML = `
    <main>
      <h1>SnapInsight</h1>
      <p>Options scaffold is ready for the validated settings flow.</p>
    </main>
  `;
}
