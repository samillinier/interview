<?php
/**
 * Plugin Name:       FIS Chat Widget
 * Plugin URI:        https://job.floorinteriorservices.com
 * Description:       Adds the Floor Interior Services live chat widget to your WordPress site. Website visitors can start a chat, and your team answers from the FIS dashboard chat inbox.
 * Version:           1.1.0
 * Author:            Floor Interior Services
 * License:           GPL-2.0-or-later
 * Text Domain:       fis-chat-widget
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

final class FIS_Chat_Widget {

	const VERSION = '1.1.0';
	const DEFAULT_API_BASE = 'https://job.floorinteriorservices.com';

	public function __construct() {
		add_action( 'wp_footer', array( $this, 'print_loader' ), 99 );
	}

	/**
	 * The API/app base. Override by defining FIS_CHAT_API_BASE in wp-config.php
	 * if the app ever moves to a different domain.
	 */
	public static function api_base() {
		$base = defined( 'FIS_CHAT_API_BASE' ) && FIS_CHAT_API_BASE
			? FIS_CHAT_API_BASE
			: self::DEFAULT_API_BASE;

		return untrailingslashit( esc_url_raw( $base ) );
	}

	/**
	 * Print the widget loader script in the footer.
	 */
	public function print_loader() {
		$script_url = add_query_arg(
			'ver',
			rawurlencode( self::VERSION ),
			self::api_base() . '/chat-embed.js'
		);

		echo '<script data-fis-chat-widget defer src="' . esc_url( $script_url ) . '"></script>' . "\n";
	}
}

new FIS_Chat_Widget();
