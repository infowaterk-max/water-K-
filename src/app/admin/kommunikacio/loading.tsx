export default function DigitalOfficeLoading(){
  return <main className="digitalOfficeDashboardPage digitalOfficeLoading" aria-busy="true" aria-label="Digitális Iroda betöltése">
    <section className="digitalOfficeDashboardHero">
      <div><span className="digitalOfficeSkeleton digitalOfficeSkeletonTitle"/><span className="digitalOfficeSkeleton digitalOfficeSkeletonText"/></div>
      <span className="digitalOfficeSkeleton digitalOfficeSkeletonDate"/>
    </section>
    <section className="digitalOfficeDashboardMetrics">
      {Array.from({length:4},(_,index)=><div className="digitalOfficeDashboardMetric digitalOfficeSkeletonCard" key={index}><span className="digitalOfficeSkeleton digitalOfficeSkeletonIcon"/><span><i className="digitalOfficeSkeleton digitalOfficeSkeletonLabel"/><i className="digitalOfficeSkeleton digitalOfficeSkeletonValue"/><i className="digitalOfficeSkeleton digitalOfficeSkeletonMeta"/></span></div>)}
    </section>
    <section className="digitalOfficeDashboardPrimaryGrid">
      {Array.from({length:3},(_,index)=><article className="digitalOfficeDashboardPanel digitalOfficeSkeletonPanel" key={index}><i className="digitalOfficeSkeleton digitalOfficeSkeletonPanelTitle"/><i className="digitalOfficeSkeleton digitalOfficeSkeletonRow"/><i className="digitalOfficeSkeleton digitalOfficeSkeletonRow"/><i className="digitalOfficeSkeleton digitalOfficeSkeletonRow"/></article>)}
    </section>
  </main>;
}
