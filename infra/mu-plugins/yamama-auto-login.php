<?php
/**
 * Plugin Name: Yamama Auto-Login
 * Description: Handles one-time magic login links from the Yamama Control Plane.
 * Version: 1.0.0
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'yamama_handle_autologin', 1 );

function yamama_handle_autologin() {
    if ( empty( $_GET['yamama_autologin'] ) ) {
        return;
    }

    $token = sanitize_text_field( wp_unslash( $_GET['yamama_autologin'] ) );
    $stored = get_option( 'yamama_autologin_token', '' );

    if ( ! $stored ) {
        wp_die( 'رابط تسجيل الدخول غير صالح.', 'خطأ', array( 'response' => 403 ) );
    }

    $data = json_decode( $stored, true );
    if ( ! $data || empty( $data['token'] ) || empty( $data['expires'] ) ) {
        delete_option( 'yamama_autologin_token' );
        wp_die( 'رابط تسجيل الدخول غير صالح.', 'خطأ', array( 'response' => 403 ) );
    }

    if ( $data['token'] !== $token ) {
        wp_die( 'رابط تسجيل الدخول غير صالح.', 'خطأ', array( 'response' => 403 ) );
    }

    if ( time() > (int) $data['expires'] ) {
        delete_option( 'yamama_autologin_token' );
        wp_die( 'انتهت صلاحية رابط تسجيل الدخول. عد إلى لوحة التحكم وأعد المحاولة.', 'انتهت الصلاحية', array( 'response' => 403 ) );
    }

    // Token is valid: consume it (one-time use)
    delete_option( 'yamama_autologin_token' );

    $admin = get_user_by( 'id', 1 );
    if ( ! $admin ) {
        wp_die( 'لم يتم العثور على حساب المدير.', 'خطأ', array( 'response' => 500 ) );
    }

    wp_set_current_user( $admin->ID );
    wp_set_auth_cookie( $admin->ID, true );

    wp_safe_redirect( admin_url() );
    exit;
}
