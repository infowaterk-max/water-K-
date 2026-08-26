<?php
/** B2C/B2B presentation helpers without changing access rules. */
defined( 'ABSPATH' ) || exit;

function waterk_is_reseller_user() {
    if ( ! is_user_logged_in() ) return false;
    $user = wp_get_current_user();
    $roles = apply_filters( 'waterk_reseller_roles', array( 'wholesale_customer', 'reseller', 'viszontelado' ) );
    return (bool) array_intersect( (array) $user->roles, $roles );
}

function waterk_customer_mode_body_class( $classes ) {
    $classes[] = waterk_is_reseller_user() ? 'wk-mode-b2b' : 'wk-mode-retail';
    return $classes;
}
add_filter( 'body_class', 'waterk_customer_mode_body_class', 40 );

function waterk_account_mode_notice() {
    if ( ! function_exists( 'is_account_page' ) || ! is_account_page() || ! is_user_logged_in() ) return;
    if ( waterk_is_reseller_user() ) {
        echo '<div class="wk-account-mode wk-account-mode--b2b"><strong>Viszonteladói fiók</strong><span>A fiókodhoz tartozó partnerfeltételek aktívak.</span></div>';
    } else {
        echo '<div class="wk-account-mode"><strong>Lakossági / céges fiók</strong><span>A normál vásárlói kínálatot látod.</span></div>';
    }
}
add_action( 'woocommerce_account_content', 'waterk_account_mode_notice', 1 );
