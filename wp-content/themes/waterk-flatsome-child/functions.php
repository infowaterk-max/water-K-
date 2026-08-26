<?php
/**
 * Water-K Flatsome Child Theme
 *
 * A nagyobb üzleti funkciók nem ide, hanem a waterk-customizations
 * pluginba kerülnek. Ez a fájl elsősorban megjelenítési és theme
 * integrációs feladatokra szolgál.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Child theme assets.
 */
function waterk_child_enqueue_assets() {
    wp_enqueue_style(
        'waterk-child-style',
        get_stylesheet_uri(),
        array(),
        wp_get_theme()->get( 'Version' )
    );
}
add_action( 'wp_enqueue_scripts', 'waterk_child_enqueue_assets', 20 );
