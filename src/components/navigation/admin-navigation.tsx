'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { usePathname } from 'next/navigation';
import { AdminMobileTableEnhancer } from '@/components/admin/admin-mobile-table-enhancer';
import type { VisibleAdminNavItem, VisibleAdminNavSection } from '@/lib/admin/workspace-navigation';

const HOVER_OPEN_DELAY_MS = 220;
const HOVER_CLOSE_DELAY_MS = 180;

function getActiveHref(pathname: string, items: VisibleAdminNavItem[]) {
  return items
    .filter((item) => item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AdminNavigation({
  sections,
  operatorItems,
  showUpgrade,
}: {
  sections: VisibleAdminNavSection[];
  operatorItems: VisibleAdminNavItem[];
  showUpgrade: boolean;
}) {
  const pathname = usePathname() || '/admin';
  const stackRef = useRef<HTMLDivElement>(null);
  const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [previewSectionId, setPreviewSectionId] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ top: 12, left: 300 });
  const allItems = [...sections.flatMap((section) => section.items), ...operatorItems];
  const activeHref = getActiveHref(pathname, allItems);
  const previewSection = sections.find((section) => section.id === previewSectionId) ?? null;

  const clearTimer = (timer: typeof hoverOpenTimer) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const cancelPreviewClose = () => clearTimer(hoverCloseTimer);
  const closePreviewSoon = () => {
    clearTimer(hoverOpenTimer);
    clearTimer(hoverCloseTimer);
    hoverCloseTimer.current = setTimeout(() => setPreviewSectionId(null), HOVER_CLOSE_DELAY_MS);
  };

  const previewOnHover = (sectionId: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    clearTimer(hoverOpenTimer);
    clearTimer(hoverCloseTimer);
    const rect = event.currentTarget.getBoundingClientRect();
    hoverOpenTimer.current = setTimeout(() => {
      setPreviewPosition({
        top: Math.max(12, Math.min(rect.top, window.innerHeight - 420)),
        left: rect.right + 12,
      });
      setPreviewSectionId(sectionId);
    }, HOVER_OPEN_DELAY_MS);
  };

  const onWorkspaceKeyDown = (event: KeyboardEvent<HTMLButtonElement>, sectionId: string) => {
    if (event.key === 'Escape') {
      setOpenSectionId(null);
      setPreviewSectionId(null);
      event.currentTarget.focus();
    }
    if (event.key === 'ArrowRight') {
      setOpenSectionId(sectionId);
      setPreviewSectionId(null);
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft') {
      setOpenSectionId((current) => current === sectionId ? null : current);
      setPreviewSectionId(null);
      event.preventDefault();
    }
  };

  useEffect(() => {
    setPreviewSectionId(null);
    if (!window.matchMedia('(max-width:850px)').matches) return;
    const active = stackRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  useEffect(() => () => {
    clearTimer(hoverOpenTimer);
    clearTimer(hoverCloseTimer);
  }, []);

  return (
    <div className="adminNavigationStack" ref={stackRef}>
      <AdminMobileTableEnhancer />
      {(sections.length > 0 || showUpgrade) && (
        <nav className="adminNav adminMerchantNav" aria-label="Aktuális webshop adminisztrációja">
          <span className="adminNavContextLabel">Aktuális webshop</span>
          {sections.map((section) => {
            const isOpen = openSectionId === section.id;
            const hasActiveItem = section.items.some((item) => item.href === activeHref);
            const regionId = `admin-workspace-${section.id}`;
            return <section className={`adminNavSection adminWorkspaceSection${isOpen ? ' adminWorkspaceOpen' : ''}${hasActiveItem ? ' adminWorkspaceActive' : ''}`} key={section.id}>
              <button
                type="button"
                className="adminNavWorkspaceButton"
                aria-expanded={isOpen}
                aria-controls={regionId}
                onClick={() => {
                  setOpenSectionId((current) => current === section.id ? null : section.id);
                  setPreviewSectionId(null);
                }}
                onPointerEnter={(event) => previewOnHover(section.id, event)}
                onPointerLeave={closePreviewSoon}
                onKeyDown={(event) => onWorkspaceKeyDown(event, section.id)}
              >
                <span className="adminNavWorkspaceText"><strong>{section.label}</strong><small>{section.summary}</small></span>
                <span className="adminNavWorkspaceChevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
              <div id={regionId} className="adminNavWorkspaceItems" hidden={!isOpen}>
                {section.items.map((item) => {
                  const active = item.href === activeHref;
                  return <Link key={item.href} href={item.href} className={active ? 'adminNavActive' : undefined} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
                })}
              </div>
            </section>;
          })}
          {showUpgrade && <Link className="adminUpgrade" href="/admin/csomag">Pro funkciók megtekintése</Link>}
        </nav>
      )}
      {operatorItems.length > 0 && (
        <nav className="adminNav adminPlatformNav" aria-label="Shoperation platform adminisztráció">
          <span className="adminNavContextLabel adminPlatformContextLabel">Shoperation platform</span>
          <section className="adminNavSection adminOperator">
            {operatorItems.map((item) => {
              const active = item.href === activeHref;
              return <Link key={item.href} href={item.href} className={active ? 'adminNavActive' : undefined} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
            })}
          </section>
        </nav>
      )}
      {previewSection && openSectionId !== previewSection.id && <aside
        className="adminNavFlyout"
        style={{ top: previewPosition.top, left: previewPosition.left }}
        onPointerEnter={cancelPreviewClose}
        onPointerLeave={closePreviewSoon}
        aria-label={`${previewSection.label} előnézet`}
      >
        <span className="adminNavFlyoutEyebrow">Előnézet</span>
        <strong>{previewSection.label}</strong>
        <p>{previewSection.summary}</p>
        <div>
          {previewSection.items.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </div>
      </aside>}
    </div>
  );
}
