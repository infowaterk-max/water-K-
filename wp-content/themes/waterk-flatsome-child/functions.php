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
    $theme_version = wp_get_theme()->get( 'Version' );

    wp_enqueue_style(
        'waterk-child-style',
        get_stylesheet_uri(),
        array(),
        $theme_version
    );

    wp_enqueue_style(
        'waterk-design-system',
        get_stylesheet_directory_uri() . '/assets/css/waterk-design-system.css',
        array( 'waterk-child-style' ),
        $theme_version
    );

    wp_enqueue_script(
        'waterk-ui',
        get_stylesheet_directory_uri() . '/assets/js/waterk-ui.js',
        array(),
        $theme_version,
        true
    );
}
add_action( 'wp_enqueue_scripts', 'waterk_child_enqueue_assets', 20 );
