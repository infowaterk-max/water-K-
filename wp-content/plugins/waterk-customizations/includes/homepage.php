<?php
/**
 * Water-K composed landing page shortcode.
 */

defined( 'ABSPATH' ) || exit;

function waterk_shortcode_homepage() {
    $sections = array(
        '[waterk_hero]',
        '[waterk_benefits]',
        '[waterk_live_products]',
        '[waterk_process]',
        '[waterk_faq]',
    );

    return '<main class="waterk-homepage">' . do_shortcode( implode( '', $sections ) ) . '</main>';
}
add_shortcode( 'waterk_homepage', 'waterk_shortcode_homepage' );
