<?php
/**
 * Water-K WooCommerce UI helpers.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Add a concise gross-price label only on catalog and single-product views.
 * Cart, checkout, emails and admin keep WooCommerce's native output untouched.
 */
function waterk_catalog_price_prefix( $price_html, $product ) {
    if ( is_admin() || wp_doing_ajax() || ! $product instanceof WC_Product ) {
        return $price_html;
    }

    if ( ! ( is_shop() || is_product_taxonomy() || is_product() ) ) {
        return $price_html;
    }

    if ( false !== strpos( $price_html, 'wk-price-label' ) ) {
        return $price_html;
    }

    return '<span class="wk-price-label">Bruttó ár</span>' . $price_html;
}
add_filter( 'woocommerce_get_price_html', 'waterk_catalog_price_prefix', 30, 2 );

/**
 * Add trust/support notes near add-to-cart on product pages.
 */
function waterk_product_purchase_notes() {
    if ( ! is_product() ) {
        return;
    }

    echo '<div class="wk-purchase-notes" aria-label="Vásárlási információk">';
    echo '<span>✓ Biztonságos fizetés</span>';
    echo '<span>✓ Magyarországi kiszállítás</span>';
    echo '<span>✓ Segítünk a megfelelő kiszerelés kiválasztásában</span>';
    echo '</div>';
}
add_action( 'woocommerce_after_add_to_cart_form', 'waterk_product_purchase_notes', 15 );

/**
 * Keep shop ordering language Hungarian and user friendly.
 */
function waterk_catalog_orderby_labels( $options ) {
    $map = array(
        'menu_order' => 'Ajánlott sorrend',
        'popularity' => 'Legnépszerűbb',
        'rating'     => 'Értékelés szerint',
        'date'       => 'Legújabb',
        'price'      => 'Ár szerint növekvő',
        'price-desc' => 'Ár szerint csökkenő',
    );

    foreach ( $map as $key => $label ) {
        if ( isset( $options[ $key ] ) ) {
            $options[ $key ] = $label;
        }
    }

    return $options;
}
add_filter( 'woocommerce_catalog_orderby', 'waterk_catalog_orderby_labels' );

/**
 * Add body class so theme CSS can target the Water-K webshop safely.
 */
function waterk_body_classes( $classes ) {
    if ( function_exists( 'is_woocommerce' ) && ( is_woocommerce() || is_cart() || is_checkout() ) ) {
        $classes[] = 'waterk-shop';
    }

    return $classes;
}
add_filter( 'body_class', 'waterk_body_classes' );
