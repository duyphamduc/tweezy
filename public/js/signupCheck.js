const app = Vue.createApp({
    data() {
        return{
            fname: '',
            lname: '',
            bday_month: '',
            bday_day: '',
            bday_year: '',
            username: '',
            email: '',
            password: '',
            confPassword: '',
            security_question: '',
            security_answer: '',
            gender: '',
            location: '',
            bio: '',

            showPwdError: false,
            showConfPwdError: false,
            showAnswerBox: false,
        }
    },

    methods: {
        checkPassword: function(e){
            this.confPassword = "";
            if (!this.validPassword(this.password)){
                this.showPwdError = true;
                this.password = "";
            }else{
                this.showPwdError = false;
            }
        },

        checkConfirmPassword: function(e){
            if(this.password !== this.confPassword){
                this.showConfPwdError = true;
                this.confPassword = "";
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

app.mount('#app')