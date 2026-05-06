import authStyles from "../../styles/auth.module.css";

function AboutPage() {
	return (
		<div
			className={authStyles.login_page_wrapper}
			style={{ background: "linear-gradient(to bottom right, #fef9f7, white)", alignItems: "flex-start", paddingTop: 64, display: "flex", flex: 1, minHeight: 0 }}
		>
			<div>
				<h1>Ostrom</h1>
				<p>aboutpage</p>
			</div>
		</div>
	)
}

export default AboutPage
