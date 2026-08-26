<?php
/**
 * Reusable Water-K marketing / webshop components.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Homepage hero shortcode.
 * Usage: [waterk_hero shop_url="/webaruhaz/"]
 */
function waterk_shortcode_hero( $atts ) {
    $atts = shortcode_atts(
        array(
            'shop_url' => '/webaruhaz/',
        ),
        $atts,
        'waterk_hero'
    );

    $shop_url = esc_url( home_url( $atts['shop_url'] ) );

    ob_start();
    ?>
    <section class="wk-hero">
        <div class="wk-shell wk-hero__grid">
            <div class="wk-reveal">
                <span class="wk-hero__badge">Water-K vízmegtartó technológia</span>
                <h1 class="wk-hero__title">Több víz a növénynek. Kevesebb veszteség.</h1>
                <p class="wk-hero__lead">Káliumtartalmú vízmegtartó polimer kertészethez, dísznövényhez, gyephez és fákhoz. A talaj nedvességét ott tartja, ahol valóban szükség van rá.</p>
                <div class="wk-actions">
                    <a class="wk-btn wk-btn--primary" href="<?php echo $shop_url; ?>">Megnézem a kiszereléseket</a>
                    <a class="wk-btn wk-btn--ghost" href="#hogyan-mukodik">Hogyan működik?</a>
                </div>
            </div>
            <aside class="wk-hero-card wk-reveal" aria-label="Water-K fő előnyei">
                <span class="wk-section__eyebrow">Egyszerű használat</span>
                <h2>Vízraktár közvetlenül a gyökérzónában</h2>
                <p>A Water-K felveszi a rendelkezésre álló vizet, majd fokozatosan visszaadja azt a növény környezetében.</p>
                <div class="wk-hero-card__metric">
                    <div class="wk-metric"><strong>9% K</strong><span>káliumtartalom</span></div>
                    <div class="wk-metric"><strong>akár 3 év</strong><span>tervezett hatástartam</span></div>
                    <div class="wk-metric"><strong>≤ 50</strong><span>nedvesedési ciklus</span></div>
                    <div class="wk-metric"><strong>4 méret</strong><span>felhasználáshoz igazítva</span></div>
                </div>
            </aside>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode( 'waterk_hero', 'waterk_shortcode_hero' );

/**
 * Benefits shortcode.
 */
function waterk_shortcode_benefits() {
    $items = array(
        array( '💧', 'Jobb vízhasznosítás', 'A nedvesség hosszabb ideig maradhat elérhető a gyökérzónában.' ),
        array( '🌿', 'Növényközpontú használat', 'Kertészethez, dísznövényhez, gyephez és fák telepítéséhez kialakítva.' ),
        array( '🧪', '9% kálium', 'A vízmegtartó funkció mellett káliumtartalmat is biztosít.' ),
        array( '♻️', 'Többszöri ciklus', 'A polimer ismételten képes vizet felvenni és leadni a használati ciklus során.' ),
    );

    ob_start();
    ?>
    <section class="wk-section wk-section--soft" id="hogyan-mukodik">
        <div class="wk-shell">
            <span class="wk-section__eyebrow">Miért Water-K?</span>
            <h2 class="wk-section__title">Kevesebb kompromisszum a vízellátásban.</h2>
            <p class="wk-section__lead">A technológia célja nem az öntözés kiváltása, hanem a kijuttatott víz jobb hasznosítása.</p>
            <div class="wk-benefits">
                <?php foreach ( $items as $item ) : ?>
                    <article class="wk-benefit wk-reveal">
                        <div class="wk-benefit__icon" aria-hidden="true"><?php echo esc_html( $item[0] ); ?></div>
                        <h3><?php echo esc_html( $item[1] ); ?></h3>
                        <p><?php echo esc_html( $item[2] ); ?></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode( 'waterk_benefits', 'waterk_shortcode_benefits' );

/**
 * Product choice section. Prices intentionally omitted from code so WooCommerce remains source of truth.
 */
function waterk_shortcode_product_selector() {
    $products = array(
        array( '40 g', 'Kisebb cserepes növényekhez és kipróbáláshoz', 'Belépő kiszerelés', false ),
        array( '750 g', 'Kertekhez, ágyásokhoz, gyephez és több növényhez', 'Legnépszerűbb', true ),
        array( '25 kg', 'Nagyobb kertészeti és professzionális felhasználásra', 'Nagy kiszerelés', false ),
    );

    ob_start();
    ?>
    <section class="wk-section">
        <div class="wk-shell">
            <span class="wk-section__eyebrow">Kiszerelések</span>
            <h2 class="wk-section__title">Válassz a felhasználás méretéhez.</h2>
            <p class="wk-section__lead">Nem a legnagyobb kiszerelés a cél, hanem az, amelyik a tényleges felhasználáshoz illik.</p>
            <div class="wk-product-grid">
                <?php foreach ( $products as $product ) : ?>
                    <article class="wk-product-card <?php echo $product[3] ? 'wk-product-card--featured' : ''; ?> wk-reveal">
                        <span class="wk-product-card__tag"><?php echo esc_html( $product[2] ); ?></span>
                        <div class="wk-product-card__size"><?php echo esc_html( $product[0] ); ?></div>
                        <p class="wk-product-card__use"><?php echo esc_html( $product[1] ); ?></p>
                        <a class="wk-btn wk-btn--primary wk-product-card__cta" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">Megnézem</a>
                    </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode( 'waterk_product_selector', 'waterk_shortcode_product_selector' );

/**
 * How-to process.
 */
function waterk_shortcode_process() {
    ob_start();
    ?>
    <section class="wk-section wk-section--soft">
        <div class="wk-shell">
            <span class="wk-section__eyebrow">Használat</span>
            <h2 class="wk-section__title">Három lépésben a gyökérzónába.</h2>
            <div class="wk-process">
                <article class="wk-process__step wk-reveal"><h3>Adagolás</h3><p>A növény és a terület igénye alapján válaszd ki a megfelelő mennyiséget.</p></article>
                <article class="wk-process__step wk-reveal"><h3>Talajba dolgozás</h3><p>A Water-K közvetlenül a gyökérzóna közelébe kerüljön, ne a felszínen maradjon.</p></article>
                <article class="wk-process__step wk-reveal"><h3>Beöntözés</h3><p>Az első alapos öntözés aktiválja a vízfelvevő működést.</p></article>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode( 'waterk_process', 'waterk_shortcode_process' );

/**
 * FAQ component.
 */
function waterk_shortcode_faq() {
    $items = array(
        array( 'Kiváltja az öntözést?', 'Nem. A Water-K célja a kijuttatott víz jobb hasznosítása és a nedvesség gyökérzónában történő megtartásának támogatása.' ),
        array( 'Hol használható?', 'Elsősorban kertészetben, dísznövényeknél, gyepnél és fák telepítésénél. Szántóföldi felhasználásra nem ezt a terméket pozicionáljuk.' ),
        array( 'Meddig használható?', 'A használati körülményektől függően többszöri nedvesedési ciklusra tervezzük, a kommunikált hatástartam legfeljebb körülbelül három év.' ),
    );

    ob_start();
    ?>
    <section class="wk-section">
        <div class="wk-shell">
            <span class="wk-section__eyebrow">Gyakori kérdések</span>
            <h2 class="wk-section__title">A lényeg röviden.</h2>
            <div class="wk-faq">
                <?php foreach ( $items as $item ) : ?>
                    <details class="wk-reveal"><summary><?php echo esc_html( $item[0] ); ?></summary><p><?php echo esc_html( $item[1] ); ?></p></details>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode( 'waterk_faq', 'waterk_shortcode_faq' );
