<?php
/**
 * Water-K composed landing page shortcode.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Compose the complete first-generation Water-K landing page.
 * Usage in a WordPress page / UX Builder shortcode element: [waterk_homepage]
 */
function waterk_shortcode_homepage() {
    $sections = array(
        '[waterk_hero]',
        '[waterk_benefits]',
        '[waterk_product_selector]',
        '[waterk_process]',
        '[waterk_faq]',
    );

    return '<main class="waterk-homepage">' . do_shortcode( implode( '', $sections ) ) . '</main>';
}
add_shortcode( 'waterk_homepage', 'waterk_shortcode_homepage' );
