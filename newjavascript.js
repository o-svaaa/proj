function alwaysFirst(select) {
    const firstOption = select.options[0];
    select.addEventListener('change', () => {
      setTimeout(() => firstOption.selected = true);
    });
  }
  function alwaysFirst2(select) {
      const firstOption = select.options[0];
      select.addEventListener('change', () => {
          setTimeout(() => firstOption.selected = true);
      });
  }
  function getFormData() {
        return {
          name: document.getElementById('name').value,
          email: document.getElementById('email').value,
          tel: document.getElementById('tel').value,
          message: document.getElementById('message').value,
          check: document.getElementById('check').checked
        };
  }

  document.addEventListener('DOMContentLoaded', function (){
      alwaysFirst(document.getElementById('menu'));
      document.getElementById('menu').addEventListener('change', function () {
          document.querySelector(this.value)?.scrollIntoView({behavior: 'smooth'});
          this.selectedIndex = 0;
      });
      alwaysFirst2(document.getElementById('menu2'));
      document.getElementById('menu2').addEventListener('change', function () {
          document.querySelector(this.value)?.scrollIntoView({behavior: 'smooth'});
          this.selectedIndex = 0;
      });

      $('.cover').slick({
              slidesToShow: 3,
              slidesToScroll: 3,
              infinite: true,
              dots: true,
              responsive: [{
                      breakpoint: 719,
                      settings: {
                          slidesToShow: 1,
                          slidesToScroll: 1,
                          dots: false
                      }
                  }
              ]
          });


      function saveFormData() {
          localStorage.setItem('formData', JSON.stringify(getFormData()));
      }
      const saved = localStorage.getItem('formData');
          if (saved) {
              const formData = JSON.parse(saved);
              document.getElementById('name').value = formData.name || '';
              document.getElementById('email').value = formData.email || '';
              document.getElementById('tel').value = formData.tel || '';
              document.getElementById('message').value = formData.message || '';
              document.getElementById('check').checked = formData.check || false;

          }
       document.querySelector('form').addEventListener('input', saveFormData);

      // отправка
      const form = document.getElementById('comment');
      form.addEventListener('submit', function (event) {
          event.preventDefault();

          const checkbox = document.getElementById('check');
          if (!checkbox.checked) {
              alert('Необходимо согласиться с политикой обработки персональных данных');
              return;
          }

          const formData = getFormData();

          fetch('https://formcarry.com/s/aBQVnBfrK1w', {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(formData)
          })
                  .then(response => response.json())
                  .then(data => {
                      if (data.code === 200) {
                          alert('Сообщение отправлено!');
                          localStorage.removeItem('formData');

                          document.getElementById('name').value = '';
                          document.getElementById('email').value = '';
                          document.getElementById('tel').value = '';
                          document.getElementById('message').value = '';
                          document.getElementById('check').checked = false;
                      } else {
                          alert('Ошибка отправки: ' + (data.message || 'Попробуйте еще раз'));
                      }
                  })
                  .catch(error => {
                      alert('Ошибка сети: ' + error.message);
                  });
      });
  });