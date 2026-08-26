<?php
/**
 * Plugin Name: Water-K Customizations
 * Description: A Water-K webáruház saját WooCommerce és üzleti funkciói.
 * Version: 1.1.0
 * Author: Water-K
 * Text Domain: waterk
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'WATERK_CUSTOMIZATIONS_VERSION' ) ) {
    define( 'WATERK_CUSTOMIZATIONS_VERSION', '1.1.0' );
}

$waterk_modules = array(
    'woocommerce.php',
    'shop-ui.php',
    'components.php',
    'customer-roles.php',
    'notifications.php',
);

foreach ( $waterk_modules as $waterk_module ) {
    $waterk_module_path = __DIR__ . '/includes/' . $waterk_module;

    if ( file_exists( $waterk_module_path ) ) {
        require_once $waterk_module_path;
    }
}
