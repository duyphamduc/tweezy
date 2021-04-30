const changePassword = Vue.createApp({
    data() {
        return{
            password: '',
            confirmPassword: '',

            showPwdError: false,
            showConfPwdError: false,
        }
    },

    methods: {
        checkPassword: function(e){
            this.confirmPassword = "";
            if (!this.validPassword(this.password)){
                this.showPwdError = true;
                this.password = "";
            }else{
                this.showPwdError = false;
            }
        },

        checkConfirmPassword: function(e){
            if(this.password !== this.confirmPassword){
                this.showConfPwdError = true;
                this.confirmPassword = "";
            }else{
                this.showConfPwdError = false;
            }
        },

        validPassword: function(password){
            var includeChars = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{3,}$/;
            return includeChars.test(password)
        }
    }
})

changePassword.mount('#changePassword')