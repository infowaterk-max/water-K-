<?php
/**
 * Dynamic Water-K product catalog helpers.
 */

defined( 'ABSPATH' ) || exit;

function waterk_get_retail_products() {
    if ( ! function_exists( 'wc_get_products' ) ) {
        return array();
    }

    $preferred_slugs = apply_filters(
        'waterk_retail_product_slugs',
        array( 'water-k-40-gr', 'water-k-750-gr', 'water-k-25-kg' )
    );

    $products = array();

    foreach ( $preferred_slugs as $slug ) {
        $matches = wc_get_products(
            array(
                'status' => 'publish',
                'slug'   => $slug,
                'limit'  => 1,
            )
        );

        if ( ! empty( $matches ) ) {
            $products[] = $matches[0];
        }
    }

    if ( count( $products ) >= 3 ) {
        return $products;
    }

    $fallback = wc_get_products(
        array(
            'status'  => 'publish',
            'limit'   => 50,
            'orderby' => 'menu_order',
            'order'   => 'ASC',
        )
    );

    $existing_ids = array_map(
        static function( $product ) { return $product->get_id(); },
        $products
    );

    foreach ( $fallback as $product ) {
        if ( count( $products ) >= 3 ) {
            break;
        }

        if ( in_array( $product->get_id(), $existing_ids, true ) ) {
            continue;
        }

        $name = strtolower( wp_strip_all_tags( $product->get_name() ) );
        if ( false !== strpos( $name, 'water-k' ) || false !== strpos( $name, 'water k' ) ) {
            $products[] = $product;
            $existing_ids[] = $product->get_id();
        }
    }

    return array_slice( $products, 0, 3 );
}

function waterk_product_use_case( $product ) {
    $name = strtolower( $product->get_name() );

    if ( false !== strpos( $name, '40' ) ) {
        return 'Kisebb cserepes növényekhez és kipróbáláshoz';
    }
    if ( false !== strpos( $name, '750' ) ) {
        return 'Kertekhez, ágyásokhoz, gyephez és több növényhez';
    }
    if ( false !== strpos( $name, '25' ) ) {
        return 'Nagyobb kertészeti és professzionális felhasználásra';
    }

    return wp_trim_words( wp_strip_all_tags( $product->get_short_description() ), 16 );
}

function waterk_product_badge( $product, $index ) {
    if ( 1 === $index ) {
        return 'Legnépszerűbb';
    }

    $name = strtolower( $product->get_name() );
    if ( false !== strpos( $name, '40' ) ) {
        return 'Kezdéshez';
    }
    if ( false !== strpos( $name, '25' ) ) {
        return 'Nagy kiszerelés';
    }

    return 'Water-K';
}

function waterk_shortcode_live_products() {
    $products = waterk_get_retail_products();

    if ( empty( $products ) ) {
        return current_user_can( 'manage_woocommerce' )
            ? '<div class="woocommerce-info">Water-K: a termékek még nincsenek összerendelve a fejlesztési komponenssel.</div>'
            : '';
    }

    ob_start();
    ?>
    <section class="wk-section" id="kiszerelesek">
        <div class="wk-shell">
            <span class="wk-section__eyebrow">Kiszerelések</span>
            <h2 class="wk-section__title">A megfelelő mennyiséget válaszd, ne automatikusan a legnagyobbat.</h2>
            <p class="wk-section__lead">Az ár, a készlet és a terméklink közvetlenül a WooCommerce-ből érkezik, így a főoldal mindig a webshop aktuális adatait mutatja.</p>
            <div class="wk-product-grid wk-product-grid--live">
                <?php foreach ( $products as $index => $product ) : ?>
                    <article class="wk-product-card <?php echo 1 === $index ? 'wk-product-card--featured' : ''; ?> wk-reveal">
                        <a class="wk-product-card__image" href="<?php echo esc_url( $product->get_permalink() ); ?>" aria-label="<?php echo esc_attr( $product->get_name() ); ?>">
                            <?php echo wp_kses_post( $product->get_image( 'woocommerce_thumbnail', array( 'loading' => 'lazy' ) ) ); ?>
                        </a>
                        <span class="wk-product-card__tag"><?php echo esc_html( waterk_product_badge( $product, $index ) ); ?></span>
                        <h3 class="wk-product-card__size"><?php echo esc_html( $product->get_name() ); ?></h3>
                        <p class="wk-product-card__use"><?php echo esc_html( waterk_product_use_case( $product ) ); ?></p>
                        <div class="wk-product-card__price"><?php echo wp_kses_post( $product->get_price_html() ); ?></div>
                        <?php if ( $product->is_in_stock() ) : ?>
                            <span class="wk-stock wk-stock--in">Raktáron</span>
                        <?php else : ?>
                            <span class="wk-stock wk-stock--out">Jelenleg nem elérhető</span>
                        <?php endif; ?>
                        <a class="wk-btn wk-btn--primary wk-product-card__cta" href="<?php echo esc_url( $product->get_permalink() ); ?>">Részletek és vásárlás</a>
                    </article>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode( 'waterk_live_products', 'waterk_shortcode_live_products' );
