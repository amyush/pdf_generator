const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const templateCache = new Map();
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

Handlebars.registerHelper('currency', (value) => {
  const num = parseFloat(value) || 0;
  return new Handlebars.SafeString(
    `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );
});

Handlebars.registerHelper('formatDate', (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
});

Handlebars.registerHelper('rowIndex', (index) => index + 1);

// default true for non-chunked renders
Handlebars.registerHelper('defaultTrue', (val) => val !== false);

function getTemplate(type) {
  if (templateCache.has(type)) return templateCache.get(type);
  const filePath = path.join(TEMPLATES_DIR, `${type}.hbs`);
  const source = fs.readFileSync(filePath, 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(type, compiled);
  return compiled;
}

function renderTemplate(type, data) {
  const template = getTemplate(type);
  return template(data);
}

module.exports = { renderTemplate };
