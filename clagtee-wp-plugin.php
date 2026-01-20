<?php
/**
 * Plugin Name: CLAGTEE 2026 Conference Site
 * Description: Integración del sitio web de la conferencia CLAGTEE 2026 y Plataforma de Gestión (CMS).
 * Version: 2.0.0
 * Author: Antigravity
 */

if (!defined('ABSPATH')) {
    exit;
}

// 1. Enqueue React App
function clagtee_enqueue_assets()
{
    wp_enqueue_script(
        'clagtee-app',
        plugins_url('/assets/index-C8FJ_gzA.js', __FILE__),
        array(),
        '2.0.0',
        true
    );
}

// 2. Shortcode
function clagtee_render_shortcode()
{
    clagtee_enqueue_assets();
    return '<div id="root"></div>';
}
add_shortcode('clagtee_site', 'clagtee_render_shortcode');


// 3. Register Custom Post Types & Roles on Activation
register_activation_hook(__FILE__, 'clagtee_activate_plugin');

function clagtee_activate_plugin()
{
    // Roles
    add_role('clagtee_author', 'Autor CLAGTEE', array('read' => true));
    add_role('clagtee_reviewer', 'Revisor CLAGTEE', array('read' => true));

    // Capability for Chairs (Admin)
    $role = get_role('administrator');
    $role->add_cap('manage_clagtee');
}

add_action('init', 'clagtee_register_cpts');
function clagtee_register_cpts()
{
    // Papers CPT
    register_post_type('clagtee_paper', array(
        'labels' => array('name' => 'Papers', 'singular_name' => 'Paper'),
        'public' => false,
        'show_ui' => true,
        'supports' => array('title', 'editor', 'author', 'custom-fields'),
        'show_in_rest' => true
    ));

    // Reviews CPT
    register_post_type('clagtee_review', array(
        'labels' => array('name' => 'Reviews', 'singular_name' => 'Review'),
        'public' => false,
        'show_ui' => true,
        'supports' => array('title', 'editor', 'author', 'custom-fields'),
        'show_in_rest' => true
    ));
}

// 4. REST API - Custom Endpoints
add_action('rest_api_init', function () {
    // POST /clagtee/v1/login
    register_rest_route('clagtee/v1', '/login', array(
        'methods' => 'POST',
        'callback' => 'clagtee_api_login',
        'permission_callback' => '__return_true'
    ));

    // GET /clagtee/v1/papers
    register_rest_route('clagtee/v1', '/papers', array(
        'methods' => 'GET',
        'callback' => 'clagtee_api_get_papers',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function clagtee_api_login($request)
{
    $creds = array(
        'user_login' => $request['email'],
        'user_password' => $request['password'],
        'remember' => true
    );

    $user = wp_signon($creds, false);

    if (is_wp_error($user)) {
        return new WP_Error('cant_login', 'Credenciales incorrectas', array('status' => 403));
    }

    // Return user info and role
    $roles = $user->roles;
    $role = 'author';
    if (in_array('administrator', $roles))
        $role = 'chair';
    elseif (in_array('clagtee_reviewer', $roles))
        $role = 'reviewer';

    return array(
        'id' => $user->ID,
        'name' => $user->display_name,
        'email' => $user->user_email,
        'role' => $role
    );
}

function clagtee_api_get_papers($request)
{
    $current_user = wp_get_current_user();
    $roles = $current_user->roles;

    $args = array(
        'post_type' => 'clagtee_paper',
        'posts_per_page' => -1
    );

    // Filter by role
    if (in_array('clagtee_author', $roles)) {
        $args['author'] = $current_user->ID;
    }
    // Chair sees all. Reviewer logic to be added (meta query)

    $query = new WP_Query($args);
    $papers = array();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $papers[] = array(
                'id' => get_the_ID(),
                'title' => get_the_title(),
                'status' => get_post_meta(get_the_ID(), '_clagtee_status', true) ?: 'pending',
                'track' => get_post_meta(get_the_ID(), '_clagtee_track', true)
            );
        }
    }
    return $papers;
}
