import type {SVGProps} from 'react';

export type VisualBuilderIconName=
  |'arrow-left'|'desktop'|'tablet'|'mobile'|'layout'|'box'|'star'|'mail'|'help'|'info'|'image'|'menu'|'text'|'plus'|'component'
  |'pages'|'layers'|'templates'|'presets'|'saved'|'globals'|'edit'|'chevron-up'|'chevron-down'|'chevron-right'|'duplicate'|'eye'|'more'|'trash'
  |'panel-menu'|'panel-right'|'undo'|'redo'|'history'|'upload'|'home'|'page'|'settings'|'reset'|'pointer'|'close'|'check'|'warning'|'error'|'grip'
  |'link'|'unlink'|'sync'|'header'|'footer';

const paths:Record<VisualBuilderIconName,readonly string[]>={
  'arrow-left':['M19 12H5','m12 19-7-7 7-7'],
  desktop:['M3 4h18v12H3z','M8 20h8','M12 16v4'],
  tablet:['M6 2h12v20H6z','M10 18h4'],
  mobile:['M8 2h8v20H8z','M11 18h2'],
  layout:['M4 5h16v14H4z','M4 10h16','M9 10v9'],
  box:['m12 3 8 4-8 4-8-4 8-4Z','M4 7v10l8 4 8-4V7','M12 11v10'],
  star:['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9L12 3Z'],
  mail:['M3 5h18v14H3z','m3 6 9 7 9-7'],
  help:['M9.7 9a2.5 2.5 0 1 1 4.6 1.4c-.7 1.1-2.3 1.4-2.3 3','M12 18h.01','M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'],
  info:['M12 10v7','M12 7h.01','M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'],
  image:['M3 5h18v14H3z','M7 9h.01','m3 17 5-5 4 4 3-3 6 6'],
  menu:['M4 6h16','M4 12h16','M4 18h16'],
  text:['M5 5h14','M12 5v14','M8 19h8'],
  plus:['M12 5v14','M5 12h14'],
  component:['m12 3 8 9-8 9-8-9 8-9Z'],
  pages:['M6 3h9l3 3v15H6z','M15 3v4h4','M9 11h6','M9 15h6'],
  layers:['m12 3 8 5-8 5-8-5 8-5Z','m4 10 8 5 8-5','m4 4 8 5 8-5'],
  templates:['M4 4h16v16H4z','M4 9h16','M9 9v11'],
  presets:['M4 6h10','M18 6h2','M4 12h2','M10 12h10','M4 18h6','M14 18h6','M14 4v4','M6 10v4','M12 16v4'],
  saved:['M6 3h12v18l-6-4-6 4V3Z'],
  globals:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z','M2 12h20','M12 2a15 15 0 0 1 0 20','M12 2a15 15 0 0 0 0 20'],
  edit:['M4 20h4L19 9l-4-4L4 16v4Z','m13.5-13.5 4 4'],
  'chevron-up':['m6 15 6-6 6 6'],
  'chevron-down':['m6 9 6 6 6-6'],
  'chevron-right':['m9 6 6 6-6 6'],
  duplicate:['M9 9h11v11H9z','M4 4h11v11H4z'],
  eye:['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  more:['M5 12h.01','M12 12h.01','M19 12h.01'],
  trash:['M4 7h16','M9 7V4h6v3','M7 7l1 14h8l1-14','M10 11v6','M14 11v6'],
  'panel-menu':['M4 6h16','M4 12h16','M4 18h16'],
  'panel-right':['M4 4h16v16H4z','M15 4v16'],
  undo:['m9 7-5 5 5 5','M5 12h8a6 6 0 0 1 6 6'],
  redo:['m15 7 5 5-5 5','M19 12h-8a6 6 0 0 0-6 6'],
  history:['M3 12a9 9 0 1 0 3-6.7','M3 3v5h5','M12 7v6l4 2'],
  upload:['M12 16V4','m7 9 5-5 5 5','M5 20h14'],
  home:['m3 11 9-8 9 8','M5 10v11h14V10','M9 21v-6h6v6'],
  page:['M6 3h9l3 3v15H6z','M15 3v4h4'],
  settings:['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z','M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 4.8-.2-.1a1.7 1.7 0 0 0-1.9-.1l-1.2.7a1.7 1.7 0 0 0-.9 1.6V24H7.2v-.1a1.7 1.7 0 0 0-.9-1.6l-1.2-.7a1.7 1.7 0 0 0-1.9.1l-.2.1L.2 17l.1-.1A1.7 1.7 0 0 0 .6 15v-1.4a1.7 1.7 0 0 0-.9-1.6l-.1-.1L2.4 7l.2.1a1.7 1.7 0 0 0 1.9.1l1.2-.7a1.7 1.7 0 0 0 .9-1.6V4.8h5.6v.1a1.7 1.7 0 0 0 .9 1.6l1.2.7a1.7 1.7 0 0 0 1.9-.1l.2-.1 2.8 4.9-.1.1a1.7 1.7 0 0 0-.9 1.6V15Z'],
  reset:['M4 4v6h6','M5 9a8 8 0 1 1-1 5'],
  pointer:['m5 3 13 8-6 2 3 6-3 1-3-6-4 4V3Z'],
  close:['m6 6 12 12','M18 6 6 18'],
  check:['m5 12 4 4 10-10'],
  warning:['m12 3 10 18H2L12 3Z','M12 9v4','M12 17h.01'],
  error:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z','M12 7v6','M12 17h.01'],
  grip:['M8 7h.01','M8 12h.01','M8 17h.01','M16 7h.01','M16 12h.01','M16 17h.01'],
  link:['M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1','M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1'],
  unlink:['M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0 .3-6.7','M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 11 20','M3 3l18 18'],
  sync:['M20 7v5h-5','M4 17v-5h5','M6.1 9A7 7 0 0 1 18 6l2 1','M17.9 15A7 7 0 0 1 6 18l-2-1'],
  header:['M4 4h16v16H4z','M4 9h16'],
  footer:['M4 4h16v16H4z','M4 15h16'],
};

export function VisualBuilderIcon({name,...props}:{name:VisualBuilderIconName}&Omit<SVGProps<SVGSVGElement>,'name'>){
  return <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name].map((path,index)=><path key={`${name}-${index}`} d={path}/>)}</svg>;
}
