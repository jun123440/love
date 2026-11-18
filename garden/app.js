const categories = {cosmos:'宇宙探索', interactive:'交互实验', play:'趣味作品', tools:'实用工具'};
const projects = window.COLLECTION;
const list = document.querySelector('#project-list');
const dialog = document.querySelector('#detail');
let filter = 'all';
let expanded = false;
let lastTrigger;
document.querySelectorAll('.total').forEach(el => el.textContent = projects.length);
document.querySelector('#year').textContent = new Date().getFullYear();

function openProject(project, trigger) {
  lastTrigger = trigger;
  document.querySelector('#detail-title').textContent = project.title;
  document.querySelector('#detail-category').textContent = categories[project.category] || '作品';
  document.querySelector('#detail-description').textContent = project.description;
  document.querySelector('#launch').href = project.url;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
dialog.addEventListener('close', () => {document.body.style.overflow = ''; lastTrigger?.focus();});
dialog.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
function render() {
  const term = document.querySelector('#search').value.trim().toLowerCase();
  const selected = projects.filter(p => (filter === 'all' || p.category === filter) && `${p.title} ${p.subtitle} ${p.description}`.toLowerCase().includes(term));
  const displayed = expanded ? selected : selected.slice(0, 6);
  list.replaceChildren();
  for (const project of displayed) {
    const button = document.createElement('button');
    button.className = 'project';
    button.setAttribute('aria-haspopup', 'dialog');
    const title = document.createElement('span');
    title.className = 'project-title';
    title.textContent = project.title;
    const subtitle = document.createElement('small');
    subtitle.textContent = project.subtitle;
    title.append(subtitle);
    const category = document.createElement('span');
    category.className = 'project-category';
    category.textContent = categories[project.category] || '作品';
    const arrow = document.createElement('span');
    arrow.className = 'project-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(title, category, arrow);
    button.addEventListener('click', () => openProject(project, button));
    list.append(button);
  }
  document.querySelector('#empty').hidden = selected.length > 0;
  document.querySelector('#count').textContent = `${displayed.length} / ${selected.length} works`;
  document.querySelector('#result-status').textContent = `显示 ${displayed.length} 件作品，共 ${selected.length} 件匹配作品`;
  const more = document.querySelector('#load-more');
  more.hidden = displayed.length >= selected.length;
  more.textContent = `继续探索 · 还有 ${selected.length - displayed.length} 件作品 ↓`;
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  expanded = false;
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b === button));
  render();
}));
document.querySelector('#search').addEventListener('input', () => { expanded = false; render(); });
document.querySelector('#load-more').addEventListener('click', () => {
  const firstNew = list.children.length;
  expanded = true;
  render();
  list.children[firstNew]?.focus({preventScroll:true});
});
render();



const lightLevel = document.querySelector('#light-level');
const lightField = document.querySelector('.light-field');
function updateLight() {
  const level = Number(lightLevel.value);
  lightField.style.setProperty('--dusk', String(level / 100));
  lightLevel.setAttribute('aria-valuetext', '月色 ' + level + '%');
}
lightLevel.addEventListener('input', updateLight);
updateLight();
