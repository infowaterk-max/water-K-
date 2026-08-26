<?php
/**
 * Header/navigation helpers.
 */

defined( 'ABSPATH' ) || exit;

function waterk_header_utility_bar() {
    if ( is_admin() ) {
        return;
    }

    $shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/webaruhaz/' );
    ?>
    <div class="wk-utility" role="region" aria-label="Water-K gyors információk">
        <div class="wk-shell wk-utility__inner">
            <span>Vízmegtartó technológia kertészethez és gyephez</span>
            <nav class="wk-utility__links" aria-label="Gyorshivatkozások">
                <a href="<?php echo esc_url( $shop_url ); ?>">Webáruház</a>
                <?php if ( function_exists( 'wc_get_cart_url' ) ) : ?>
                    <a href="<?php echo esc_url( wc_get_cart_url() ); ?>">Kosár</a>
                <?php endif; ?>
                <?php if ( function_exists( 'wc_get_page_permalink' ) ) : ?>
                    <a href="<?php echo esc_url( wc_get_page_permalink( 'myaccount' ) ); ?>">Fiókom</a>
                <?php endif; ?>
            </nav>
        </div>
    </div>
    <?php
}
add_action( 'wp_body_open', 'waterk_header_utility_bar', 5 );

function waterk_cart_count_fragment( $fragments ) {
    if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
        return $fragments;
    }

    ob_start();
    ?>
    <span class="wk-cart-count" data-waterk-cart-count><?php echo esc_html( WC()->cart->get_cart_contents_count() ); ?></span>
    <?php
    $fragments['span[data-waterk-cart-count]'] = ob_get_clean();
    return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'waterk_cart_count_fragment' );

function waterk_body_state_classes( $classes ) {
    $classes[] = is_user_logged_in() ? 'wk-user-logged-in' : 'wk-user-guest';

    if ( function_exists( 'is_cart' ) && is_cart() ) {
        $classes[] = 'wk-cart-page';
    }
    if ( function_exists( 'is_checkout' ) && is_checkout() ) {
        $classes[] = 'wk-checkout-page';
    }
    return $classes;
}
add_filter( 'body_class', 'waterk_body_state_classes', 30 );
