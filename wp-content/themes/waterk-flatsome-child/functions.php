<?php
/**
 * Water-K Flatsome Child Theme
 */

defined( 'ABSPATH' ) || exit;

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

    wp_enqueue_style(
        'waterk-ui',
        get_stylesheet_directory_uri() . '/assets/css/waterk-ui.css',
        array( 'waterk-design-system' ),
        $theme_version
    );

    wp_enqueue_style(
        'waterk-woocommerce',
        get_stylesheet_directory_uri() . '/assets/css/waterk-woocommerce.css',
        array( 'waterk-ui' ),
        $theme_version
    );

    wp_enqueue_style(
        'waterk-commerce',
        get_stylesheet_directory_uri() . '/assets/css/waterk-commerce.css',
        array( 'waterk-woocommerce' ),
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
