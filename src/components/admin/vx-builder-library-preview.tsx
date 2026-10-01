import type {VxLibraryDescriptor} from '@/lib/builder/vx-builder-library';
import styles from './vx-builder-library.module.css';

export function VxBuilderLibraryPreview({descriptor,size='card',label}:{descriptor:VxLibraryDescriptor;size?:'compact'|'card'|'detail';label?:string}){
  return <div className={styles.preview} data-kind={descriptor.kind} data-size={size} aria-label={label?\`\${label} vizuális előnézete\`:undefined} role={label?'img':undefined}>
    <div className={styles.previewStage} aria-hidden="true">
      <span className={styles.previewKicker}/>
      <span className={styles.previewHeadline}/>
      <span className={styles.previewCopy}/>
      <span className={styles.previewAction}/>
      <span className={styles.previewMedia}/>
      <span className={\`\${styles.previewTile} \${styles.previewTileOne}\`}/>
      <span className={\`\${styles.previewTile} \${styles.previewTileTwo}\`}/>
      <span className={\`\${styles.previewTile} \${styles.previewTileThree}\`}/>
    </div>
    {size!=='compact'?<span className={styles.previewBadge}>{descriptor.categoryLabel}</span>:null}
  </div>;
}
