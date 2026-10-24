const fs = require('fs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { createServer } = require('vite');

(async () => {
  let code = fs.readFileSync('src/components/ServiceManagement.jsx', 'utf-8');
  code = code.replace("useState({ open: false, mode: 'create', data: null })", "useState({ open: true, mode: 'create', data: null })");
  fs.writeFileSync('scratch/TestServiceModal.jsx', code);

  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });
  try {
    const mod = await server.ssrLoadModule('/scratch/TestServiceModal.jsx');
    const Component = mod.default;
    const html = ReactDOMServer.renderToString(React.createElement(Component));
    console.log('SUCCESS_MODAL_RENDER! Length:', html.length);
  } catch (err) {
    console.error('ERROR_MODAL_RENDER:', err);
  } finally {
    await server.close();
    try { fs.unlinkSync('scratch/TestServiceModal.jsx'); } catch (e) {}
  }
})();
