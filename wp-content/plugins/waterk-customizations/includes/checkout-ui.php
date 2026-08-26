<?php
/** Checkout/cart usability helpers. */
defined( 'ABSPATH' ) || exit;

function waterk_checkout_intro() {
    if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_order_received_page() ) return;
    echo '<section class="wk-checkout-intro"><span class="wk-section__eyebrow">Biztonságos rendelés</span><h1>Majdnem kész.</h1><p>Ellenőrizd az adatokat, válaszd ki a szállítást és a fizetési módot. A rendelés leadása előtt mindent még egyszer át tudsz nézni.</p></section>';
}
add_action( 'woocommerce_before_checkout_form', 'waterk_checkout_intro', 4 );

function waterk_cart_reassurance() {
    if ( ! function_exists( 'is_cart' ) || ! is_cart() ) return;
    echo '<div class="wk-cart-reassurance"><strong>Water-K rendelés</strong><span>Biztonságos fizetés</span><span>Átlátható szállítás</span><span>Segítség kiszerelés-választáshoz</span></div>';
}
add_action( 'woocommerce_before_cart', 'waterk_cart_reassurance', 5 );

function waterk_checkout_order_button_text() { return 'Rendelés leadása'; }
add_filter( 'woocommerce_order_button_text', 'waterk_checkout_order_button_text' );
